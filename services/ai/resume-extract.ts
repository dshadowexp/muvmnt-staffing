import { generateText } from "ai";
import { google } from "./models/google";

export async function extractResumeKeyPoints(
  fileBuffer: ArrayBuffer,
  mimeType: string,
): Promise<string> {
  const { text } = await generateText({
    model: google("gemini-2.5-flash"),
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
            text: `Extract the key points from this resume for a behavioural interview. Return a concise summary in this format:

NAME: (candidate name)
CURRENT/MOST RECENT ROLE: (title + employer)
YEARS OF EXPERIENCE: (estimated total)
KEY SKILLS: (comma-separated list)
NOTABLE ACHIEVEMENTS: (2-3 bullet points)
CAREER PROGRESSION: (brief trajectory)
EDUCATION: (highest qualification)
CERTIFICATIONS: (if any)

Keep the total output under 800 words. Focus on facts that would generate good behavioural interview questions (STAR method).`,
          },
        ],
      },
    ],
  });

  return text;
}
