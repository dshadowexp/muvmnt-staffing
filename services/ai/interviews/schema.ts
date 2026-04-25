import { z } from "zod";

/**
 * Shape of a single rubric entry in the interview feedback. Category labels
 * are descriptive strings so the rubric can be extended without a schema change.
 */
export const interviewScoreSchema = z.object({
  label: z
    .string()
    .describe(
      "Human-readable category name matching the rubric (e.g. 'Clinical Knowledge' or 'Teamwork & Collaboration')",
    ),
  score: z
    .number()
    .describe("Integer score from 0 to 5 for this category"),
});

export const interviewFeedbackSchema = z.object({
  candidate_name: z
    .string()
    .describe("Full name of the candidate as it appeared in the interview"),
  interview_type: z
    .enum(["COMBINED", "CLINICAL", "BEHAVIORAL"])
    .describe("Which rubric was applied — COMBINED for the single unified interview"),
  decision: z
    .enum(["PASS", "FAIL"])
    .describe("Overall hiring decision based on all rubric scores"),
  average_score: z
    .number()
    .describe("Mean of all rubric scores (0-5)"),
  scores: z
    .array(interviewScoreSchema)
    .describe(
      "All rubric categories with scores in the order listed in the system prompt. " +
      "COMBINED interviews produce ten scores (five clinical then five behavioral).",
    ),
  strengths: z
    .array(z.string())
    .describe("2-4 concrete, transcript-grounded strengths"),
  weaknesses: z
    .array(z.string())
    .describe("2-4 concrete, transcript-grounded concerns or gaps"),
  risk_flags: z
    .array(z.string())
    .describe(
      "Safety, ethical, or compliance flags observed. Empty array when none.",
    ),
  summary: z
    .string()
    .describe("2-4 sentence justification of the decision"),
});

export type InterviewFeedback = z.infer<typeof interviewFeedbackSchema>;
export type InterviewScore = z.infer<typeof interviewScoreSchema>;
