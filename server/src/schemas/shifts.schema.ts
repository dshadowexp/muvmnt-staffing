import { z } from 'zod';

export const ShiftIdParams = z.object({
  shiftId: z.string().uuid(),
});

export type ShiftIdParamsType = z.infer<typeof ShiftIdParams>;
