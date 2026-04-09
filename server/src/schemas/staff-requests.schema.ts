import { z } from 'zod';

const timeHm = z
  .string()
  .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time (use HH:mm)');

export const MatchedWorkerPreviewSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  yearsExp: z.number(),
});

export const StaffMatchTierSchema = z.object({
  tierId: z.enum(['pulse', 'harbor', 'summit']),
  name: z.string(),
  tagline: z.string(),
  worker: MatchedWorkerPreviewSchema.nullable(),
  hourlyRate: z.number(),
  estimatedTotalCents: z.number(),
});

export const CreateAndMatchBody = z
  .object({
    profession: z.string().min(1),
    startDate: z.string().min(1),
    endDate: z.string().nullable().optional(),
    startTime: timeHm,
    endTime: timeHm,
    requirements: z.array(z.string()).default([]),
    tasks: z.array(z.string()).default([]),
    positions: z.coerce.number().int().min(1),
    notes: z.string().optional().default(''),
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.startDate);
    if (Number.isNaN(start.getTime())) {
      ctx.addIssue({
        code: 'custom',
        message: 'Invalid start date',
        path: ['startDate'],
      });
      return;
    }
    if (data.endDate) {
      const end = new Date(data.endDate);
      if (Number.isNaN(end.getTime())) {
        ctx.addIssue({
          code: 'custom',
          message: 'Invalid end date',
          path: ['endDate'],
        });
        return;
      }
      if (end < start) {
        ctx.addIssue({
          code: 'custom',
          message: 'End date must be on or after start date',
          path: ['endDate'],
        });
      }
    }
    const [sh, sm] = data.startTime.split(':').map(Number);
    const [eh, em] = data.endTime.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    if (endMins <= startMins) {
      ctx.addIssue({
        code: 'custom',
        message: 'End time must be after start time',
        path: ['endTime'],
      });
    }
  });

export const CreateAndMatchReply = z.object({
  jobId: z.string(),
  tiers: z.array(StaffMatchTierSchema),
  ringCellCount: z.number(),
  candidateCount: z.number(),
  currency: z.literal('CAD'),
});

export const FinalizeMatchBody = z.object({
  jobId: z.string().min(1),
  hourlyRate: z.coerce.number().min(15, 'Minimum hourly rate is $15'),
  notes: z.string().optional().default(''),
});

export const FinalizeMatchReply = z.object({
  ok: z.literal(true),
});

export const AbandonDraftParams = z.object({
  jobId: z.string().min(1),
});

export const OkReply = z.object({
  ok: z.literal(true),
});

export type CreateAndMatchBodyType = z.infer<typeof CreateAndMatchBody>;
export type CreateAndMatchReplyType = z.infer<typeof CreateAndMatchReply>;
export type FinalizeMatchBodyType = z.infer<typeof FinalizeMatchBody>;
export type FinalizeMatchReplyType = z.infer<typeof FinalizeMatchReply>;
