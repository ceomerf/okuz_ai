import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Ders adlarını normalize eden harita
const SUBJECT_NORMALIZATION_MAP: Record<string, string> = {
  'İleri Matematik': 'Matematik',
  'İleri Fizik': 'Fizik',
  'İleri Kimya': 'Kimya',
  'İleri Biyoloji': 'Biyoloji',
  'Türk Dili ve Edebiyatı': 'Türkçe',
  'T.C. İnkılap Tarihi ve Atatürkçülük': 'Tarih',
};

// Türkçe ay → month (9=Eylül ... 6=Haziran)
const TR_MONTHS: Record<string, number> = {
  'Eylül': 9,
  'Eki': 10,
  'Ekim': 10,
  'Kasım': 11,
  'Aralık': 12,
  'Oca': 1,
  'Ocak': 1,
  'Şub': 2,
  'Şubat': 2,
  'Mar': 3,
  'Mart': 3,
  'Nis': 4,
  'Nisan': 4,
  'Mayıs': 5,
  'May': 5,
  'Haziran': 6,
  'Haz': 6,
};

type CsvRow = string[];

function parseCsv(content: string): CsvRow[] {
  const rows: CsvRow[] = [];
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
      // consume \r\n
      if (ch === '\r' && content[i + 1] === '\n') i++;
      row.push(field.trim()); field = '';
      // skip empty lines
      if (row.length > 1 || (row.length === 1 && row[0] !== '')) rows.push(row);
      row = []; i++; continue;
    }
    field += ch; i++;
  }
  // last field
  if (field.length > 0 || row.length > 0) { row.push(field.trim()); rows.push(row); }
  return rows;
}

function gradeFromFilename(filename: string): number {
  if (filename.startsWith('9')) return 9;
  if (filename.startsWith('10')) return 10;
  if (filename.startsWith('11')) return 11;
  if (filename.startsWith('12')) return 12;
  return 11;
}

function monthFromDateRange(tr: string): number | undefined {
  // örn: "8-19 Eylül" veya "22 Eylül - 3 Ekim" veya "29 Aralık - 9 Ocak"
  const parts = tr.split(/\s*[-–]\s*|\s*-\s*/).map(s => s.trim());
  // tar aralığı bazen tek parça olabilir (ör. "Yarıyıl Tatili")
  const candidates = tr.split(/\s+/);
  for (const token of candidates) {
    for (const key of Object.keys(TR_MONTHS)) {
      if (token.includes(key)) return TR_MONTHS[key];
    }
  }
  // fallback: ikinci parçada ay olabilir
  if (parts.length > 1) {
    for (const key of Object.keys(TR_MONTHS)) {
      if (parts[1].includes(key)) return TR_MONTHS[key];
    }
  }
  return undefined;
}

function splitUnitAndTopic(cell: string): { unit: string; topic: string } | null {
  if (!cell || cell.toLowerCase().includes('tatil') || cell.toLowerCase().includes('yazılı')) return null;
  const idx = cell.indexOf(':');
  if (idx !== -1) {
    const unit = cell.slice(0, idx).trim();
    const topic = cell.slice(idx + 1).trim();
    if (!unit || !topic) return null;
    return { unit, topic };
  }
  // tek başına konu gibi davran
  const single = cell.trim();
  if (!single) return null;
  return { unit: 'Genel', topic: single };
}

async function importCsvFile(csvPath: string, includeNew: boolean, seasonModelYear: string) {
  const base = path.basename(csvPath);
  const isNew = base.toLowerCase().includes('yeni');
  if (isNew && !includeNew) {
    console.log(`[IMPORT] ${base} atlandı (YENİ ve includeNew=false)`);
    return 0;
  }
  const grade = gradeFromFilename(base);
  // Mevcut sezon için tüm veriler aynı modelYear ile kaydedilir
  const modelYear = seasonModelYear;

  const content = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(content);
  if (rows.length < 2) return 0;
  const header = rows[0];

  // Sütun isimlerinden ders kolon indexlerini bul
  const subjectColumns: { idx: number; official: string; normalized: string }[] = [];
  for (let i = 0; i < header.length; i++) {
    const h = header[i].trim();
    if (['Türk Dili ve Edebiyatı', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'T.C. İnkılap Tarihi ve Atatürkçülük'].includes(h)) {
      subjectColumns.push({ idx: i, official: h, normalized: SUBJECT_NORMALIZATION_MAP[h] || h });
    }
  }

  const tarihIndex = header.findIndex(h => h.toLowerCase().includes('tarih aralığı'));
  let inserted = 0;
  const batch: any[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const tarihStr = tarihIndex >= 0 ? (row[tarihIndex] || '') : '';
    const month = monthFromDateRange(tarihStr);
    for (const col of subjectColumns) {
      const cell = row[col.idx] || '';
      const parsed = splitUnitAndTopic(cell);
      if (!parsed) continue;
      batch.push({
        grade,
        subject: col.normalized,
        unit: parsed.unit,
        topic: parsed.topic,
        month: month ?? null,
        officialSubjectName: col.official,
        modelYear,
        outcomes: [],
        tytWeight: 0,
        aytWeight: 0,
      });
    }
  }

  if (batch.length > 0) {
    // unique by grade-subject-topic-modelYear
    const uniqKey = (x: any) => `${x.grade}|${(x.subject||'').toLowerCase()}|${(x.topic||'').toLowerCase()}|${x.modelYear}`;
    const uniqMap = new Map<string, any>();
    for (const x of batch) { if (!uniqMap.has(uniqKey(x))) uniqMap.set(uniqKey(x), x); }
    const data = Array.from(uniqMap.values());
    const chunkSize = 1000;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await prisma.mebTopic.createMany({ data: chunk, skipDuplicates: true });
      inserted += chunk.length;
    }
  }

  console.log(`[IMPORT] ${base} işlendi → ${inserted} kayıt eklendi.`);
  return inserted;
}

async function main() {
  // Parametreler:
  // --include-new   : *YENİ* dosyaları da yükle (varsayılan: bu sezon için true)
  // --season=YYYY-YYYY : modelYear değeri (varsayılan: 2025-2026)
  const includeNew = process.argv.includes('--include-new') || true;
  const seasonArg = process.argv.find(a => a.startsWith('--season='));
  const seasonModelYear = seasonArg ? seasonArg.split('=')[1] : '2025-2026';
  // CSV'leri backend klasöründen oku
  const root = path.resolve(__dirname, '../');
  const files = [
    '9MÜFREDAT.csv',
    '10MÜFREDAT.csv',
    '11MÜFREDAT.csv',
    '12MÜFREDAT.csv',
    // Yeni yıl verileri (opsiyonel)
    '11MÜFREDATYENİ.csv',
    '12MÜFREDATYENİ.csv',
  ];

  let total = 0;
  for (const f of files) {
    const p = path.join(root, f);
    if (fs.existsSync(p)) {
      total += await importCsvFile(p, includeNew, seasonModelYear);
    } else {
      console.log(`[IMPORT] ${f} bulunamadı, atlandı.`);
    }
  }
  console.log(`[IMPORT] Sezon=${seasonModelYear} Toplam eklenen kayıt: ${total}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });


