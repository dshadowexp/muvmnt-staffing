import { Output, streamText } from 'ai';
import { QuestionSchema } from '@/services/ai/quizes/schema';
import { google } from '@/services/ai/models/google';

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const formData   = await req.formData();
  const skillName  = formData.get('skillName') as string;
  const skillDesc  = formData.get('skillDescription') as string;
  const batchIndex = parseInt(formData.get('batchIndex') as string ?? '0', 10);
  const file       = formData.get('file') as File | null;

  // Build context from file if provided
  let fileContext = '';
  if (file) {
    const text   = await file.text();
    fileContext  = `\n\nReference material provided:\n${text.slice(0, 8000)}`;
  }

  // Track previously asked question topics to avoid repetition
  const previousTopics = formData.get('previousTopics') as string ?? '';

  const difficultyProgression = batchIndex < 2
    ? 'beginner to intermediate'
    : batchIndex < 4
      ? 'intermediate'
      : 'intermediate to advanced';

  const result = streamText({
    model:  google('gemini-2.5-flash'),
    output: Output.object({ schema: QuestionSchema }),
    prompt: `You are generating a professional healthcare certification assessment.

Skill being assessed: ${skillName}
Skill description: ${skillDesc}${fileContext}

Generate exactly 2 multiple choice questions for batch #${batchIndex + 1}.
Difficulty level for this batch: ${difficultyProgression}

Rules:
- Questions must be practical and scenario-based, not just theoretical
- Each question must have exactly 4 options (a, b, c, d)
- Mix question types: roughly 1 in 3 questions should be type "multi" (select all that apply)
- For "single" type: exactly 1 correct answer in correctIds
- For "multi" type: 2 or 3 correct answers in correctIds, question text must end with "(Select all that apply)"
- Explanation should be 1-2 sentences covering all correct answers
- Do NOT repeat these topics already covered: ${previousTopics || 'none yet'}
- Questions should test real-world application of ${skillName} skills
- Suitable for healthcare staff certification
- Question ids should be q${batchIndex * 2 + 1} and q${batchIndex * 2 + 2}`,
  });

  return result.toTextStreamResponse();
}