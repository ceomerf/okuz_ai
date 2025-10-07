import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CurriculumEngineService {
  constructor(private readonly prisma: PrismaService) {}

  // MEB konu önşartları ve sınıf/alan filtreleriyle konu sıralaması oluştur
  async buildPrerequisiteAwareTopicOrder(subjects: string[], grade: number, examType?: string): Promise<string[]> {
    // Basit ilk sürüm: seçilen derslere ait MebTopic'leri çek, ay ve YKS ağırlığına göre sırala
    const topics = await this.prisma.mebTopic.findMany({
      where: { subject: { in: subjects }, grade },
      orderBy: [
        { month: 'asc' },
        { tytWeight: 'desc' },
        { aytWeight: 'desc' },
      ],
      take: 200,
    });

    // Önşart ağı basit kontrol: prerequisite olanları sonraya itme (tam topolojik sıralama yerine minimal kısıt)
    const prereqs = await this.prisma.topicPrerequisite.findMany({
      where: { topicId: { in: topics.map(t => t.id) } },
    });
    const prereqMap = new Map<string, Set<string>>();
    for (const p of prereqs) {
      if (!prereqMap.has(p.topicId)) prereqMap.set(p.topicId, new Set());
      prereqMap.get(p.topicId)!.add(p.prerequisiteId);
    }

    const idToTopic = new Map(topics.map(t => [t.id, t] as const));
    const ordered: string[] = [];
    const visited = new Set<string>();

    const dfs = (id: string, stack: Set<string>) => {
      if (visited.has(id)) return;
      if (stack.has(id)) return; // döngü koruması
      stack.add(id);
      const prereqIds = prereqMap.get(id);
      if (prereqIds) {
        for (const pr of prereqIds) {
          if (idToTopic.has(pr)) dfs(pr, stack);
        }
      }
      stack.delete(id);
      visited.add(id);
      const t = idToTopic.get(id);
      if (t) ordered.push(`${t.subject}::${t.topic}`);
    };

    for (const t of topics) dfs(t.id, new Set());
    return ordered.length > 0 ? ordered : topics.map(t => `${t.subject}::${t.topic}`);
  }
}


