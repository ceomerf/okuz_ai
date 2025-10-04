import { z } from 'zod';

// Zod şeması: AI'dan dönecek plan yapısını doğrulamak için kullanılır
// Validasyon mesajları Türkçe ve alanlar açıkça tiplenmiştir.

export const aiPlanSessionSchema = z.object({
  day: z.string().min(1, 'Gün boş olamaz'),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/g, 'startTime HH:mm formatında olmalıdır'),
  subject: z.string().min(1, 'Ders adı boş olamaz'),
  topic: z.string().min(1, 'Konu adı boş olamaz'),
  type: z.enum(['Konu Anlatımı', 'Soru Çözümü', 'Pekiştirme', 'Review']),
  durationMinutes: z
    .number()
    .int('Süre tam sayı olmalıdır')
    .positive('Süre pozitif olmalıdır'),
  objective: z.string().min(3, 'Hedef çok kısa'),
  recommendedTechnique: z
    .string()
    .min(3, 'Önerilen teknik çok kısa'),
  resources: z.array(z.string()).default([]),
});

export const aiPlanWeeklySchema = z.object({
  week: z.number().int().positive(),
  focus: z.string().min(3, 'Odak çok kısa'),
  sessions: z
    .array(aiPlanSessionSchema)
    .min(1, 'En az bir seans olmalıdır'),
});

export const aiPlanSchema = z.object({
  planId: z.string().min(1, 'planId boş olamaz'),
  studentId: z
    .string()
    .min(1, 'studentId boş olamaz'),
  summary: z
    .string()
    .min(10, 'Özet daha açıklayıcı olmalıdır'),
  weeklyPlans: z
    .array(aiPlanWeeklySchema)
    .min(1, 'En az bir haftalık plan olmalıdır'),
  milestones: z
    .array(
      z.object({
        title: z.string().min(3, 'Milestone başlığı çok kısa'),
        description: z.string().min(3, 'Milestone açıklaması çok kısa'),
      })
    )
    .optional()
    .default([]),
  adaptiveStrategies: z
    .array(
      z.object({
        title: z.string().min(3, 'Strateji başlığı çok kısa'),
        description: z.string().min(3, 'Strateji açıklaması çok kısa'),
      })
    )
    .optional()
    .default([]),
});

export type AiPlan = z.infer<typeof aiPlanSchema>;
export type AiPlanWeekly = z.infer<typeof aiPlanWeeklySchema>;
export type AiPlanSession = z.infer<typeof aiPlanSessionSchema>;


