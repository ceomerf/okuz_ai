import { Injectable } from '@nestjs/common';
import { UserInsights } from './adaptive-insights.service';

export interface AdaptiveHints {
  sessionDuration: number;
  breakMinutes: number;
  preferredHours: string[];
  subjectBoosts: Record<string, number>; // 0..1 ek ağırlık
  subjectAvoid: string[];
}

@Injectable()
export class AdaptiveStrategyService {
  deriveHints(insights: UserInsights): AdaptiveHints {
    const baseDuration = Math.max(25, Math.min(90, insights.avgSessionDurationMin || 40));
    const breakMinutes = Math.max(5, Math.min(20, Math.round((insights.avgBreakMinutes || 10))));
    const preferredHours = insights.preferredStudyHours?.length ? insights.preferredStudyHours : ['evening'];

    const subjectBoosts: Record<string, number> = {};
    const subjectAvoid: string[] = [];

    for (const [subject, affinity] of Object.entries(insights.subjectAffinity || {})) {
      if (affinity >= 0.25) {
        subjectBoosts[subject] = Math.min(1, 0.1 + affinity * 0.3);
      }
      if (affinity <= -0.4) {
        subjectAvoid.push(subject);
      }
    }

    // Düşük sınav skorları olan derslere de hafif boost ver
    for (const [subject, score] of Object.entries(insights.recentExamScores || {})) {
      if (score < 55) {
        subjectBoosts[subject] = Math.max(subjectBoosts[subject] || 0, 0.2);
      }
    }

    return { sessionDuration: baseDuration, breakMinutes, preferredHours, subjectBoosts, subjectAvoid };
  }
}


