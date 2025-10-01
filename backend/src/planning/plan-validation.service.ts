import { Injectable } from '@nestjs/common';
import { z } from 'zod';

@Injectable()
export class PlanValidationService {
	// Ana plan ve seans şemaları
	readonly sessionSchema = z.object({
		subject: z.string().min(1),
		topic: z.string().min(1),
		durationInMinutes: z.number().int().positive(),
		type: z.enum(['study', 'review', 'practice', 'exam']).default('study'),
		week: z.number().int().positive(),
		day: z.string().min(1),
		resources: z.array(z.string()).optional().default([]),
		objectives: z.array(z.string()).optional().default([]),
		prerequisites: z.array(z.string()).optional().default([]),
	});

	readonly weeklyPlanSchema = z.object({
		weekNumber: z.number().int().nonnegative(),
		startDate: z.coerce.date(),
		endDate: z.coerce.date(),
		totalStudyTime: z.number().int().nonnegative(),
		sessions: z.array(this.sessionSchema),
		milestones: z.array(z.string()).optional().default([]),
		assessments: z.array(z.unknown()).optional().default([]),
	});

	readonly aiPlanSchema = z.object({
		planTitle: z.string().min(1),
		planSummary: z.string().optional(),
		weeklyPlans: z.array(this.weeklyPlanSchema).nonempty(),
	});

	validateAiPlan<T>(plan: T) {
		return this.aiPlanSchema.parse(plan);
	}

	validateSessions<T>(sessions: T[]) {
		return z.array(this.sessionSchema).parse(sessions);
	}

	// İş kuralları: zaman/süre, müfredat uygunluğu vb.
	assertBusinessRules(plan: unknown) {
		const parsed = this.aiPlanSchema.parse(plan);
		for (const week of parsed.weeklyPlans) {
			if (week.endDate < week.startDate) {
				throw new Error('Week endDate must be after startDate');
			}
		}
		return parsed;
	}
}
