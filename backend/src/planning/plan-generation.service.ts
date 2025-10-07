import { Injectable, Logger } from '@nestjs/common';
import { PlanType } from '@prisma/client';
import { OpenAIService } from '../services/openai.service';
import { MetricsService } from '../monitoring/metrics.service';
import { DigitalDossierService } from './digital-dossier.service';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class PlanGenerationService {
	private readonly logger = new Logger(PlanGenerationService.name);

	constructor(
		private readonly openaiService: OpenAIService,
		private readonly metrics: MetricsService,
		private readonly dossier: DigitalDossierService,
	) {}

	/**
	 * AI içeriği üretimi için dayanıklı çağrı: exponential backoff ile tekrar dener.
	 */
	async generateContentWithRetry(prompt: string, maxRetries = 2, initialDelayMs = 1000): Promise<string> {
		const startTime = Date.now();
		let attempt = 0;
		let lastError: any;
		let success = false;

    while (attempt <= maxRetries) {
			try {
				const result = await this.openaiService.generateContent(prompt);
				success = true;
				return result;
			} catch (err: any) {
				lastError = err;
        const status = (err && err.status) || (err && err.response && err.response.status);
        const message = (err && err.message) || '';
        // Mesaja göre ayrım: "Bad Request" gibi client hatalarında retry yapma
        if (/bad\s*request/i.test(message)) {
          break;
        }
        // Status bilinmiyorsa transient varsay (API Error vb.)
        const isTransient = status == null ? true : (status >= 500 || status === 429);
        if (!isTransient || attempt === maxRetries) {
					break;
				}
				const backoff = initialDelayMs * Math.pow(2, attempt);
				await new Promise((res) => setTimeout(res, backoff));
				attempt++;
			}
		}

		const duration = Date.now() - startTime;
		this.metrics.recordAiApiCall('openai', duration, success);

		throw lastError || new Error('OpenAIService request failed');
	}

	/**
	 * Ana plan üretimi
	 */
	async generatePlan(data: any): Promise<{ plan: any; sessions: any[] }> {
		// Basit plan üretimi - gerçek implementasyon için AI kullanılabilir
    const plan = {
			title: `${data.subjects.join(', ')} Çalışma Planı`,
			description: `${data.goals.join(', ')} hedefleri için oluşturulmuş plan`,
      type: PlanType.WEEKLY,
			subjects: data.subjects,
			goals: data.goals,
			startDate: new Date(),
			endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		};

		const sessions = this.generateSampleSessions(data);

		return { plan, sessions };
	}

  private generateSampleSessions(data: any): any[] {
		const sessions = [];
		const subjects = data.subjects || ['Matematik', 'Türkçe'];
    // 7 gün zorunluluğu weekly modda; aksi halde planDurationDays kullanılacak
    const planDays = Number(data.planDurationDays) > 0 ? Number(data.planDurationDays) : (String(data.planType || '').toLowerCase() === 'weekly' ? 7 : 3);
    const sessionsPerDay = 2;
    const totalSessions = planDays * sessionsPerDay;

		for (let i = 0; i < totalSessions; i++) {
			const subject = subjects[i % subjects.length];
      const startTime = new Date();
      startTime.setDate(startTime.getDate() + Math.floor(i / sessionsPerDay));

			sessions.push({
				subject,
				topic: `${subject} - Konu ${i + 1}`,
				startTime,
				duration: 60,
				difficulty: 'medium',
				type: 'study',
			});
		}

		return sessions;
	}

	// ---- Taşınan yardımcılar ----
  filterSubjectsForGradeAndTrack(subjects: string[], grade: number, track: string): string[] {
		if (!Array.isArray(subjects) || subjects.length === 0) return [];
		if (grade < 11) return subjects;
		const norm = (v: string) => String(v || '').toLowerCase();
		const cleaned = subjects.map(s => String(s).trim()).filter(Boolean);
		const SAYISAL = ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'];
		const EA = ['Matematik', 'Türkçe', 'Tarih', 'Coğrafya'];
		const SOZEL = ['Türkçe', 'Tarih', 'Coğrafya'];
		let allowed: string[] | null = null;
		switch (norm(track)) {
			case 'sayisal': allowed = SAYISAL; break;
			case 'ea':
			case 'eşit ağırlık':
			case 'esit agirlik':
			case 'eşit_ağırlık': allowed = EA; break;
			case 'sozel':
			case 'sözel': allowed = SOZEL; break;
			default: allowed = null;
		}
		if (!allowed) return subjects;
		const allowedSet = new Set(allowed.map(norm));
		const filtered = cleaned.filter(s => allowedSet.has(norm(s)));
		return filtered.length > 0 ? filtered : subjects;
	}

  buildScheduleFromTopics(topicList: string[], planData: { planDurationDays?: number; subjects: string[]; userId?: string }): any {
    const planDurationDays = Number((planData as any)?.planDurationDays) > 0 ? Number((planData as any).planDurationDays) : 7;
		const sessionsPerDay = 2;
		const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

		// Konu listesi boş geldiğinde koruma: derslerden genel tekrar başlıkları üret
		const hasTopics = Array.isArray(topicList) && topicList.length > 0;
		const fallbackTopics = Array.isArray(planData.subjects) && planData.subjects.length > 0
			? planData.subjects.map((s) => `${s}::Genel tekrar`)
			: ['Genel::Çalışma'];
		const effectiveTopicList = hasTopics ? topicList : fallbackTopics;

		const seed = this.seedFrom(((planData as any)?.userId || 'default-user').toString());
		const shuffledTopicList = this.shuffleWithSeed(effectiveTopicList, seed);

		const sessions: any[] = [];
		for (let day = 0; day < planDurationDays; day++) {
			const dayName = days[day % 7];
			for (let s = 0; s < sessionsPerDay; s++) {
				const idx = day * sessionsPerDay + s;
				if (idx >= shuffledTopicList.length) break;
				const topic = shuffledTopicList[idx];
				const subject = this.determineSubjectFromTopic(topic, planData.subjects);
				sessions.push({
					week: 1,
					day: dayName,
					subject,
					topic,
					durationInMinutes: 45 + (s * 5),
					type: 'study',
					difficulty: 'medium',
					objectives: [],
					resources: [],
					techniques: [],
				});
			}
		}

		return {
			weeklyPlans: [{ week: 1, focus: 'Kişiselleştirilmiş odak', sessions }],
			milestones: [{ week: 1, goal: 'Temel kavramları kavra', assessment: 'Quiz', criteria: '70% başarı' }],
			adaptiveStrategies: ['Zorlandığında konuyu böl', 'Başarılı olduğunda zorluk seviyesini artır'],
		};
	}

	private determineSubjectFromTopic(topic: string, subjects: string[]): string {
		const topicLower = (topic || '').toLowerCase();
		if (topicLower.includes('matematik') || topicLower.includes('sayı') || topicLower.includes('denklem')) return subjects.includes('Matematik') ? 'Matematik' : subjects[0];
		if (topicLower.includes('türkçe') || topicLower.includes('dil') || topicLower.includes('paragraf')) return subjects.includes('Türkçe') ? 'Türkçe' : subjects[0];
		if (topicLower.includes('fizik') || topicLower.includes('kuvvet') || topicLower.includes('elektrik')) return subjects.includes('Fizik') ? 'Fizik' : subjects[0];
		if (topicLower.includes('kimya') || topicLower.includes('atom') || topicLower.includes('organik')) return subjects.includes('Kimya') ? 'Kimya' : subjects[0];
		return subjects[0];
	}

  async enrichSkeletonWithAI(skeleton: any, learningStyle: string, context?: { insights?: any; hints?: any; imageUrl?: string }): Promise<any> {
		for (const week of skeleton.weeklyPlans) {
			for (const session of week.sessions) {
				try {
					const tmpl = readFileSync(join(__dirname, 'strategic_prompt_template.md'), 'utf-8');
					const userId = context?.insights?.userId;
          const dossier = userId ? await this.dossier.buildUserDossier(userId) : JSON.stringify({ insights: context?.insights, hints: context?.hints, session: { subject: session.subject, topic: session.topic }, learningStyle });
          const imageHint = context?.imageUrl ? `IMAGE_URL: ${context.imageUrl}` : '';
          const prompt = tmpl.replace('{{DIGITAL_DOSSIER}}', dossier).replace('{{IMAGE_HINT}}', imageHint);
					const details = await this.generateContentWithRetry(prompt);
					const cleaned = this.cleanAiJsonResponse(details);
					const parsedDetails = JSON.parse(cleaned);
					session.objectives = parsedDetails.objectives || [];
					session.techniques = parsedDetails.techniques || [];
					session.resources = ['Ders kitabı', 'Notlar', 'Online kaynaklar'];
				} catch (error) {
					session.objectives = ['Konuyu anla', 'Temel kavramları öğren'];
					session.techniques = ['Not al', 'Tekrar et', 'Pratik yap'];
					session.resources = ['Ders kitabı', 'Notlar'];
				}
			}
		}
		return skeleton;
	}

	getDayOffset(day: string): number {
		const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
		const idx = days.findIndex((d) => d.toLowerCase() === String(day || '').toLowerCase());
		return idx >= 0 ? idx : 0;
	}

	private cleanAiJsonResponse(raw: string): string {
		const trimmed = (raw || '').trim();
		const start = trimmed.indexOf('{');
		const end = trimmed.lastIndexOf('}');
		if (start >= 0 && end >= 0 && end > start) {
			return trimmed.substring(start, end + 1);
		}
		return '{}';
	}

	private seedFrom(s: string): number {
		let h = 2166136261;
		for (let i = 0; i < s.length; i++) {
			h ^= s.charCodeAt(i);
			h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
		}
		return Math.abs(h);
	}

	private shuffleWithSeed<T>(arr: T[], seed: number): T[] {
		const a = arr.slice();
		let m = a.length, i: number;
		while (m) {
			i = Math.floor(this.randomWithSeed(seed) * m--);
			[a[m], a[i]] = [a[i], a[m]];
			seed = (seed * 9301 + 49297) % 233280;
		}
		return a;
	}

	private randomWithSeed(seed: number): number {
		seed = (seed * 9301 + 49297) % 233280;
		return seed / 233280;
	}

	// Test için gerekli metodlar
	parseJsonBlock(jsonString: string): any {
		try {
			const cleaned = this.cleanAiJsonResponse(jsonString);
			return JSON.parse(cleaned);
		} catch (error) {
			return {};
		}
	}

  normalizeText(input: string): string {
    if (!input) return '';
    return input
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .replace(/[şŞ]/g, 's')
      .replace(/[ıİ]/g, 'i')
      .replace(/[çÇ]/g, 'c')
      .replace(/[ğĞ]/g, 'g')
      .replace(/[üÜ]/g, 'u')
      .replace(/[öÖ]/g, 'o');
  }
}


