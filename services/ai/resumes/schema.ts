import z from "zod";

export const aiSummarySchema = z.object({
  candidate: z
    .object({
      name: z.string().describe("Full name as written on the resume"),
      currentRole: z
        .string()
        .describe(
          "Most recent role and employer (e.g. 'Senior Engineer at Acme')",
        ),
      yearsOfExperience: z
        .string()
        .describe(
          "Total professional experience as a short string (e.g. '8 years')",
        ),
    })
    .describe("Top-line candidate identity"),
  keySkills: z
    .array(z.string())
    .describe("5-10 short skill labels (technical and soft)"),
  notableAchievements: z
    .array(z.string())
    .describe("2-3 concrete accomplishments with measurable impact"),
  careerProgression: z
    .string()
    .describe("1-2 concise sentences about career trajectory"),
  education: z
    .string()
    .describe("Highest qualification with institution"),
  certifications: z
    .array(z.string())
    .describe("Professional certifications, empty array if none"),
  validation: z
    .object({
      valid: z
        .boolean()
        .describe(
          "true if this is a genuine CV/resume with sufficient content for a behavioural interview; false otherwise",
        ),
      reason: z
        .string()
        .optional()
        .describe(
          "If valid is false: a short human-readable reason (e.g. 'not a resume', 'insufficient detail', 'blank or unreadable'). Omit if valid is true.",
        ),
    })
    .describe("Validity verdict for the uploaded document"),
});

export type ResumeSummary = z.infer<typeof aiSummarySchema>;
