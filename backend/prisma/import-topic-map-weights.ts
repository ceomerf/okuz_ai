import { PrismaClient, ExamType } from '@prisma/client';
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

function normalizeExamTypes(examTypeCell: string): ExamType[] {
  const raw = (examTypeCell || '').toUpperCase();
  // Örnek: "TYT & AYT" → ['TYT','AYT']
  const parts = raw.split(/&|,|\//).map(s => s.trim()).filter(Boolean);
  const mapped: ExamType[] = [];
  for (const p of parts) {
    if (p.includes('TYT')) mapped.push('TYT');
    else if (p.includes('AYT')) mapped.push('AYT');
    else if (p.includes('LGS')) mapped.push('LGS');
    else if (p.includes('KPSS')) mapped.push('KPSS');
  }
  return mapped.length ? mapped : ['TYT'];
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
    const mebTopic = await prisma.mebTopic.findFirst({ where: { subject, topic } });
    if (!mebTopic) {
      console.warn(`[IMPORT] MebTopic bulunamadı: ${subject} / ${topic}`);
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
      const prereqTokens = prereq.split(/;|,|\//).map(s => s.trim()).filter(Boolean);
      for (const token of prereqTokens) {
        // Eşleşmeyi subject + topic ile yapıyoruz (aynı ders içinde)
        const prereqTopic = await prisma.mebTopic.findFirst({ where: { subject, topic: token } });
        if (!prereqTopic) { console.warn(`[IMPORT] Prereq bulunamadı: ${subject} / ${token}`); continue; }
        const dupe = await prisma.topicPrerequisite.findFirst({ where: { topicId: mebTopic.id, prerequisiteId: prereqTopic.id } });
        if (dupe) continue;
        await prisma.topicPrerequisite.create({ data: { topicId: mebTopic.id, prerequisiteId: prereqTopic.id } });
        prereqInserted++;
      }
    }
  }

  console.log(`[IMPORT] TopicWeight eklenen: ${weightInserted}, TopicPrerequisite eklenen: ${prereqInserted}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });


