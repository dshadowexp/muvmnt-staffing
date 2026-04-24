import { streamText, Output } from "ai";
import { google } from "../models/google";
import { aiSummarySchema } from "./schema";

export async function streamResumeKeyPoints(
  fileBuffer: ArrayBuffer,
  mimeType: string,
  candidateName?: string,
) {
  return streamText({
    model: google("gemini-2.5-flash"),
    output: Output.object({
      schema: aiSummarySchema
    }),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "file",
            data: fileBuffer,
            mediaType: mimeType,
          },
          {
            type: "text",
            text: `Extract the key resume signals for a behavioural interview.
Return STRICT JSON matching the provided schema. Never invent details — use empty strings or empty arrays for sections without relevant content.
${candidateName ? `\nExpected candidate name: "${candidateName}"\n` : ""}
Field guidance:
- candidate.name: full name exactly as on the resume.
- candidate.currentRole: most recent title and employer (e.g. "PSW at Sunrise Care Home").
- candidate.yearsOfExperience: short string like "8 years" or "10+ years".
- keySkills: 5-10 short labels covering both technical and soft skills.
- notableAchievements: 2-3 concrete accomplishments with measurable impact.
- careerProgression: 1-2 concise sentences summarising trajectory.
- education: highest qualification with institution only.
- certifications: licence/cert names; empty array when none.
- validation.valid: set to true ONLY if the document is clearly a genuine CV or resume that contains at minimum a candidate name, at least one role or experience entry, and enough content (≥ ~50 meaningful words) to generate meaningful behavioural interview questions. Set to false (with a concise reason) when: the document is not a resume or CV, is blank or corrupted, contains fewer than ~50 meaningful words, lacks a name or any work experience, or is an entirely unrelated file type or document.${candidateName ? ` Additionally, if an expected candidate name is provided, verify that the name on the resume clearly matches it (allowing for minor spelling variants or middle name differences). If the names clearly do not match, set valid=false with reason "name mismatch".` : ""}
- validation.reason: include only when valid is false; keep it short and factual (e.g. "not a resume", "no work experience found", "document appears blank or unreadable"${candidateName ? `, "name mismatch"` : ""}).

Keep individual string fields under ~25 words. Focus on facts that would produce strong STAR-method behavioural questions.`,
          },
        ],
      },
    ],
  });
}
