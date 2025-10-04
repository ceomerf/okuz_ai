import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Basit CSV parser (çift tırnaklı alanları destekler)
function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let i = 0, field = '', inQuotes = false, row: string[] = [];
  while (i < content.length) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { row.push(field.trim()); field = ''; i++; continue; }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && content[i + 1] === '\n') i++;
      row.push(field.trim()); field = '';
      if (row.length && !(row.length === 1 && row[0] === '')) rows.push(row);
      row = []; i++; continue;
    }
    field += ch; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field.trim()); rows.push(row); }
  return rows;
}

type ExamTypeLiteral = 'TYT' | 'AYT' | 'LGS' | 'KPSS';

function normalizeExamTypes(examTypeCell: string): ExamTypeLiteral[] {
  const raw = (examTypeCell || '').toUpperCase();
  // Örnek: "TYT & AYT" → ['TYT','AYT']
  const parts = raw.split(/&|\//).map(s => s.trim()).filter(Boolean); // ',' ayırıcı KALDIRILDI
  const mapped: ExamTypeLiteral[] = [];
  for (const p of parts) {
    if (p.includes('TYT')) mapped.push('TYT');
    else if (p.includes('AYT')) mapped.push('AYT');
    else if (p.includes('LGS')) mapped.push('LGS');
    else if (p.includes('KPSS')) mapped.push('KPSS');
  }
  return mapped.length ? mapped : ['TYT'];
}

// Alias haritası: CSV konu adı -> MebTopic.topic
const TOPIC_ALIAS: Record<string, string> = {
  'Asitler': 'Asitler, Bazlar ve Tuzlar',
  'Bazlar': 'Asitler, Bazlar ve Tuzlar',
  'Tuzlar': 'Asitler, Bazlar ve Tuzlar',
  'Özel Üçgenler': 'Özel Üçgenler (Dik, İkizkenar, Eşkenar)',
  'Manyetizma': 'Manyetizma (TYT)',
};

function normalizeTopicName(name: string): string {
  const lower = (name || '').toLowerCase().trim();
  // Parantez içini normalize etmeden önce alias kontrolü
  const alias = TOPIC_ALIAS[name];
  if (alias) return alias;
  // Parantez içi açıklamaları ve çoklu boşlukları sadeleştir
  const noParens = lower.replace(/\(.+?\)/g, '').replace(/\s+/g, ' ').trim();
  return noParens;
}

async function findMebTopicLoose(prisma: PrismaClient, subject: string, rawTopic: string) {
  // 1) Exact match
  let found: any = await prisma.mebTopic.findFirst({ where: { subject, topic: rawTopic } });
  if (found) return found;
  // 2) Alias exact
  const alias = TOPIC_ALIAS[rawTopic];
  if (alias) {
    found = await prisma.mebTopic.findFirst({ where: { subject, topic: alias } });
    if (found) return found;
  }
  // 3) Normalize-equal match (parantez/boşluk temizliği)
  const norm = normalizeTopicName(rawTopic);
  const candidates = await prisma.mebTopic.findMany({ where: { subject } });
  found = candidates.find(c => normalizeTopicName(c.topic) === norm);
  if (found) return found;
  // 4) Contains/startsWith fallback
  found = candidates.find(c => c.topic.toLowerCase().includes(norm) || normalizeTopicName(c.topic).startsWith(norm));
  return found || null;
}

async function main() {
  const csvPath = path.resolve(__dirname, './topic_map_weights.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`[IMPORT] CSV bulunamadı: ${csvPath}`);
    process.exit(1);
  }
  const content = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(content);
  if (rows.length < 2) {
    console.error('[IMPORT] CSV boş veya header yok');
    process.exit(1);
  }
  const header = rows[0];
  const idx = {
    subject: header.indexOf('subject'),
    topic: header.indexOf('topic'),
    prerequisiteTopic: header.indexOf('prerequisiteTopic'),
    examType: header.indexOf('examType'),
    weight: header.indexOf('weight'),
    difficultyDist: header.indexOf('difficultyDist'),
  };

  let weightInserted = 0;
  let prereqInserted = 0;
  const unmatched: Array<{ subject: string; topic: string; reason: string }> = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const subject = row[idx.subject] || '';
    const topic = row[idx.topic] || '';
    const prereq = row[idx.prerequisiteTopic] || '';
    const examTypeCell = row[idx.examType] || '';
    const weightCell = row[idx.weight] || '0';
    const diffDistCell = row[idx.difficultyDist] || '[]';

    if (!subject || !topic) continue;

    // MebTopic eşleştirme (modelYear null olabilir)
    const mebTopic = await findMebTopicLoose(prisma, subject, topic);
    if (!mebTopic) {
      console.warn(`[IMPORT] MebTopic bulunamadı: ${subject} / ${topic}`);
      unmatched.push({ subject, topic, reason: 'MebTopic not found' });
      continue;
    }

    // Difficulty parse: JSON veya array string
    let difficultyDist: any;
    try { difficultyDist = JSON.parse(diffDistCell); } catch { difficultyDist = []; }

    const weight = parseFloat(weightCell);
    const examTypes = normalizeExamTypes(examTypeCell);

    // TopicWeight kayıtları (her examType için unique)
    for (const et of examTypes) {
      const exists = await prisma.topicWeight.findFirst({ where: { mebTopicId: mebTopic.id, examType: et } });
      if (exists) continue;
      await prisma.topicWeight.create({ data: { mebTopicId: mebTopic.id, examType: et, weight, difficultyDist } });
      weightInserted++;
    }

    // TopicPrerequisite oluşturma (birden fazla olabilir: ";" veya "," ile ayrılmış)
    if (prereq && prereq.toLowerCase() !== 'yok') {
      const prereqTokens = prereq.split(/;|\//).map(s => s.trim()).filter(Boolean); // ',' ayırıcı KALDIRILDI
      for (const token of prereqTokens) {
        // Eşleşmeyi subject + topic ile yapıyoruz (aynı ders içinde), loose match
        const prereqTopic = await findMebTopicLoose(prisma, subject, token);
        if (!prereqTopic) { console.warn(`[IMPORT] Prereq bulunamadı: ${subject} / ${token}`); continue; }
        const dupe = await prisma.topicPrerequisite.findFirst({ where: { topicId: mebTopic.id, prerequisiteId: prereqTopic.id } });
        if (dupe) continue;
        await prisma.topicPrerequisite.create({ data: { topicId: mebTopic.id, prerequisiteId: prereqTopic.id } });
        prereqInserted++;
      }
    }
  }

  // Eşleşmeyenleri dosyaya yaz
  try {
    const outPath = path.resolve(__dirname, './topic_map_unmatched.csv');
    const lines = ['subject,topic,reason', ...unmatched.map(u => `${u.subject},${u.topic},${u.reason}`)];
    fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
    console.log(`[IMPORT] Unmatched exported: ${outPath} (${unmatched.length})`);
  } catch {}

  console.log(`[IMPORT] TopicWeight eklenen: ${weightInserted}, TopicPrerequisite eklenen: ${prereqInserted}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });


