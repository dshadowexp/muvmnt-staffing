import { z } from "zod";

const timeHm = z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/);

function quarterMinute(t: string): number {
  const m = Number(t.split(":")[1]);
  return Number.isFinite(m) ? m : NaN;
}

const slotSchema = z
  .object({
    start: timeHm,
    end: timeHm,
  })
  .superRefine((s, ctx) => {
    const q = [0, 15, 30, 45];
    if (!q.includes(quarterMinute(s.start))) {
      ctx.addIssue({
        code: "custom",
        message: "Use 15-minute times (e.g. 9:00, 9:15).",
        path: ["start"],
      });
    }
    const endOk =
      s.end === "23:59" || q.includes(quarterMinute(s.end));
    if (!endOk) {
      ctx.addIssue({
        code: "custom",
        message: "Use 15-minute times (e.g. 5:00, 5:15), or 11:59 PM to end the day.",
        path: ["end"],
      });
    }
    const [sh, sm] = s.start.split(":").map(Number);
    const [eh, em] = s.end.split(":").map(Number);
    if (sh * 60 + sm >= eh * 60 + em) {
      ctx.addIssue({
        code: "custom",
        message: "End time must be after start time",
        path: ["end"],
      });
    }
  });

const daySchema = z.object({
  enabled: z.boolean(),
  slots: z.array(slotSchema).min(1),
});

export const availabilityOnboardingPayloadSchema = z
  .object({
    timezone: z.string().min(1, "Choose a timezone"),
    week: z.record(z.string(), daySchema),
  })
  .superRefine((data, ctx) => {
    const hasWorking = Object.values(data.week).some(
      (d) => d.enabled && d.slots.length > 0,
    );
    if (!hasWorking) {
      ctx.addIssue({
        code: "custom",
        message: "Turn on at least one day and set working hours.",
        path: ["week"],
      });
    }
  });

export type AvailabilityOnboardingPayload = z.infer<
  typeof availabilityOnboardingPayloadSchema
>;
