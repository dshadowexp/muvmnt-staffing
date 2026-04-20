import { streamText, Output } from "ai";
import { google } from "../models/google";
import { aiSummarySchema } from "./schema";

export async function streamResumeKeyPoints(
  fileBuffer: ArrayBuffer,
  mimeType: string,
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

Field guidance:
- candidate.name: full name exactly as on the resume.
- candidate.currentRole: most recent title and employer (e.g. "PSW at Sunrise Care Home").
- candidate.yearsOfExperience: short string like "8 years" or "10+ years".
- keySkills: 5-10 short labels covering both technical and soft skills.
- notableAchievements: 2-3 concrete accomplishments with measurable impact.
- careerProgression: 1-2 concise sentences summarising trajectory.
- education: highest qualification with institution only.
- certifications: licence/cert names; empty array when none.

Keep individual string fields under ~25 words. Focus on facts that would produce strong STAR-method behavioural questions.`,
          },
        ],
      },
    ],
  });
}
