import { generateObject } from "ai";
import { google } from "../models/google";
import { z } from "zod";

const quizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).min(2).max(6),
  correctAnswers: z
    .array(z.number())
    .min(1)
    .describe("Zero-based indices of the correct option(s)"),
  explanation: z
    .string()
    .describe("Brief explanation of why the answer is correct"),
  timeSeconds: z
    .number()
    .int()
    .min(15)
    .max(120)
    .describe("Reasonable time limit for this question in seconds"),
});

const fivePackSchema = z.object({
  questions: z.array(quizQuestionSchema).length(5),
});

const fillPackSchema = z.object({
  questions: z.array(quizQuestionSchema).min(1).max(8),
});

export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

const BASE_INSTRUCTIONS_WITH_FILE = `You are a healthcare certification assessment expert. The uploaded file is for the named certification.

First, skim the document only to infer: issuing body or standard (if visible), credential type/level, title or scope, and any stated competencies. Use those signals plus the certification name to choose overall difficulty and the main topical focus. Do not assume details that are not supported by the file or the name.

Requirements for each question:
- Practical knowledge, not trivial recall only
- Some items may have multiple correct answers
- Prefer 4 options (sometimes 5 for "select all that apply")
- Per-question timeSeconds: 30–90 for most, up to 120 for complex
- Clear, educational explanations

Topic areas (weight toward what the document implies):
- Core knowledge and theory
- Practical application and procedures
- Safety protocols and best practices
- Regulatory and compliance
- Scenario-based clinical judgment`;

const BASE_INSTRUCTIONS_SKILL_ONLY = `You are a healthcare certification assessment expert. The worker is claiming a skill WITHOUT a supporting document, so you must rely on the skill name and short description below.

Write broadly applicable questions that match Canadian healthcare practice for the skill. Do not invent an issuing body, course code, or specific curriculum — keep questions grounded in widely accepted clinical practice, safety, and scope-of-practice norms.

Requirements for each question:
- Practical knowledge, not trivial recall only
- Some items may have multiple correct answers
- Prefer 4 options (sometimes 5 for "select all that apply")
- Per-question timeSeconds: 30–90 for most, up to 120 for complex
- Clear, educational explanations

Topic areas:
- Core knowledge and theory
- Practical application and procedures
- Safety protocols and best practices
- Regulatory and compliance (general)
- Scenario-based clinical judgment`;

type BatchRole = "foundations" | "safety_compliance" | "scenarios";

function batchRolePrompt(role: BatchRole): string {
  switch (role) {
    case "foundations":
      return `This is batch A (first of three). Generate exactly 5 questions focused on foundations: core knowledge, terminology, and basic principles.`;
    case "safety_compliance":
      return `This is batch B (second wave). Generate exactly 5 questions focused on safety protocols, infection control where relevant, regulatory/compliance, and operational best practices.`;
    case "scenarios":
      return `This is batch C (second wave). Generate exactly 5 questions focused on scenario-based clinical judgment, prioritization, communication, and realistic workplace situations.`;
  }
}

function avoidBlock(stems: string[]): string {
  if (stems.length === 0) return "";
  const lines = stems
    .map((s, i) => `${i + 1}. ${s.slice(0, 220)}`)
    .join("\n");
  return `

Do NOT repeat or closely paraphrase any of these existing question stems (write wholly new stems):
${lines}`;
}

function skillContextBlock(
  certificationName: string,
  description?: string,
): string {
  const parts = [`Skill / certification name: "${certificationName}"`];
  if (description && description.trim().length > 0) {
    parts.push(`Short description: ${description.trim()}`);
  }
  return parts.join("\n");
}

type QuizSource =
  | {
      kind: "file";
      fileBuffer: ArrayBuffer;
      mimeType: string;
      /** Optional — falls back to the certification name only when absent. */
      description?: string;
    }
  | {
      kind: "skill";
      /** Required — the quiz has only name + description to work from. */
      description?: string;
    };

function buildUserContent(
  source: QuizSource,
  certificationName: string,
  suffix: string,
) {
  const context = skillContextBlock(certificationName, source.description);

  if (source.kind === "file") {
    return [
      {
        type: "file" as const,
        data: source.fileBuffer,
        mediaType: source.mimeType,
      },
      {
        type: "text" as const,
        text: `${BASE_INSTRUCTIONS_WITH_FILE}

${context}

${suffix}`,
      },
    ];
  }

  return [
    {
      type: "text" as const,
      text: `${BASE_INSTRUCTIONS_SKILL_ONLY}

${context}

${suffix}`,
    },
  ];
}

/**
 * Five questions in one structured call — used for fast first paint and
 * parallel follow-up batches. Works with or without an uploaded document.
 */
export async function generateCertificationQuizBatch({
  certificationName,
  source,
  batchRole,
  avoidQuestionStems,
}: {
  certificationName: string;
  source: QuizSource;
  batchRole: BatchRole;
  avoidQuestionStems: string[];
}): Promise<QuizQuestion[]> {
  const suffix = `${batchRolePrompt(batchRole)}${avoidBlock(avoidQuestionStems)}`;
  const { object } = await generateObject({
    model: google("gemini-2.5-flash"),
    schema: fivePackSchema,
    messages: [
      {
        role: "user",
        content: buildUserContent(source, certificationName, suffix),
      },
    ],
  });

  return object.questions;
}

/**
 * Top up to target length when deduplication removed overlaps between parallel
 * batches. Works with or without an uploaded document.
 */
export async function generateCertificationQuizTopUp({
  certificationName,
  source,
  count,
  avoidQuestionStems,
}: {
  certificationName: string;
  source: QuizSource;
  count: number;
  avoidQuestionStems: string[];
}): Promise<QuizQuestion[]> {
  const capped = Math.min(Math.max(1, count), 8);
  const suffix = `Generate exactly ${capped} new multiple-choice questions that are distinct from one another and from any existing stems.${avoidBlock(avoidQuestionStems)}`;
  const { object } = await generateObject({
    model: google("gemini-2.5-flash"),
    schema: fillPackSchema,
    messages: [
      {
        role: "user",
        content: buildUserContent(source, certificationName, suffix),
      },
    ],
  });

  return object.questions.slice(0, capped);
}

export function dedupeQuizQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  const seen = new Set<string>();
  const out: QuizQuestion[] = [];
  for (const q of questions) {
    const key = q.question.trim().toLowerCase().slice(0, 200);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}
