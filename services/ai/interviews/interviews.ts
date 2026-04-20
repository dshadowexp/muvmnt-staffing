import { Output, generateText, streamText } from "ai";
import { fetchChatMessages } from "../../hume/lib/api";
import { google } from "../models/google";
import { interviewFeedbackSchema } from "./schema";

type InterviewInfo = {
  title: string;
  profession: string;
  description: string;
};

type FormattedMessage = {
  speaker: "interviewee" | "interviewer";
  text: string;
  emotionFeatures?: unknown;
};

async function loadFormattedMessages(
  humeChatId: string,
  humeGroupChatId: string | null,
): Promise<FormattedMessage[]> {
  const messages = await fetchChatMessages(humeChatId, humeGroupChatId);

  const result: FormattedMessage[] = [];
  for (const message of messages) {
    if (message.type !== "USER_MESSAGE" && message.type !== "AGENT_MESSAGE") {
      continue;
    }
    if (message.messageText == null) continue;

    result.push({
      speaker:
        message.type === "USER_MESSAGE" ? "interviewee" : "interviewer",
      text: message.messageText,
      emotionFeatures:
        message.role === "USER" ? message.emotionFeatures : undefined,
    });
  }
  return result;
}

function buildFeedbackSystemPrompt({
  userName,
  interviewInfo,
}: {
  userName: string;
  interviewInfo: InterviewInfo;
}): string {
  return `You are an evaluation engine for a healthcare staffing agency. Your task is to assess an interview transcript and determine whether the candidate PASSES or FAILS.

You must be strict, objective, and risk-aware. In healthcare, unsafe candidates must NOT pass.

---

## INPUT PARAMETERS

* Candidate Name: ${userName}
* Interview Type: ${interviewInfo.title}
* Profession: ${interviewInfo.profession}
* Context: ${interviewInfo.description}

---

## OBJECTIVE

Evaluate whether ${userName} is safe, competent, and reliable enough to be placed in a healthcare role.

---

## EVALUATION FRAMEWORK

### IF interview_type = CLINICAL

Score the candidate (0-5) in each category, in this exact order:

1. Clinical Knowledge — Understanding of procedures, protocols, and best practices
2. Patient Safety Awareness — Ability to identify risks and avoid harm
3. Critical Thinking & Decision-Making — Handles scenarios logically and safely
4. Communication Clarity — Clear, structured, professional responses
5. Consistency & Accuracy — No contradictions or unsafe statements

### IF interview_type = BEHAVIORAL

Score the candidate (0-5) in each category, in this exact order:

1. Communication Skills
2. Teamwork & Collaboration
3. Accountability & Ownership
4. Adaptability & Problem-Solving
5. Honesty & Consistency

---

## SCORING RUBRIC

* 5 = excellent, no concerns
* 4 = strong, minor gaps
* 3 = acceptable but noticeable gaps
* 2 = weak, concerning gaps
* 1 = poor, major concerns
* 0 = unsafe / unacceptable

---

## FAILURE CONDITIONS (CRITICAL)

Immediately FAIL the candidate if ANY of the following occur:

* Demonstrates unsafe clinical decisions
* Shows lack of patient safety awareness
* Provides contradictory or dishonest answers
* Cannot answer fundamental questions for their experience level
* Gives vague answers with no real examples (behavioural)

---

## DECISION LOGIC

1. Compute the average score across all five categories
2. Apply rules:
   * If any category score is <= 1 → FAIL
   * If average < 3 → FAIL
   * Otherwise → PASS

---

## OUTPUT CONTRACT

Return ONLY the structured object the system expects. The structure MUST match the schema provided by the tool:

- \`candidate_name\`: the candidate's full name (use "${userName}" unless the transcript clearly overrides it)
- \`interview_type\`: "CLINICAL" or "BEHAVIORAL" (pick the rubric you applied)
- \`decision\`: "PASS" or "FAIL"
- \`average_score\`: number, one decimal place acceptable
- \`scores\`: array of exactly FIVE objects \`{ label, score }\`. Labels MUST match the rubric order above for the chosen interview_type. Scores are integers 0-5.
- \`strengths\`: 2-4 short, concrete, transcript-grounded strengths
- \`weaknesses\`: 2-4 short, concrete, transcript-grounded concerns
- \`risk_flags\`: safety/ethical/compliance concerns; use an empty array when none
- \`summary\`: 2-4 sentence justification for the decision

Do not invent information not supported by the transcript.

## CONSTRAINTS

* Be strict: this is healthcare, not a general job
* Do NOT be lenient to "borderline" candidates
* Base evaluation ONLY on the transcript
* Do NOT hallucinate missing information
* Keep reasoning concise and evidence-based

## GOAL

Ensure only candidates who are safe, competent, and reliable PASS. All others must FAIL.`;
}

/**
 * Streams the interview feedback as partial JSON that matches
 * {@link interviewFeedbackSchema}. Pipe the returned result to a
 * Response via `result.toTextStreamResponse()` from a route handler, and use
 * `useObject` on the client with the same schema to progressively render it.
 *
 * Pass `onFinish` to persist the final parsed object once the stream ends.
 */
export async function streamAiInterviewFeedback({
  humeChatId,
  humeGroupChatId,
  interviewInfo,
  userName,
  onFinish,
}: {
  humeChatId: string;
  interviewInfo: InterviewInfo;
  humeGroupChatId: string | null;
  userName: string;
  onFinish?: Parameters<typeof streamText>[0]["onFinish"];
}) {
  const formattedMessages = await loadFormattedMessages(humeChatId, humeGroupChatId);

  return streamText({
    model: google("gemini-2.5-flash"),
    output: Output.object({ schema: interviewFeedbackSchema }),
    system: buildFeedbackSystemPrompt({ userName, interviewInfo }),
    prompt: JSON.stringify(formattedMessages),
    onFinish,
  });
}

/**
 * Non-streaming variant kept for existing server-action callers. Returns the
 * raw text produced by the model, ready to be normalized and parsed.
//  */
// export async function generateAiInterviewFeedback({
//   humeChatId,
//   humeGroupChatId,
//   interviewInfo,
//   userName,
// }: {
//   humeChatId: string;
//   humeGroupChatId: string | null;
//   interviewInfo: InterviewInfo;
//   userName: string;
// }) {
//   const formattedMessages = await loadFormattedMessages(humeChatId, humeGroupChatId);

//   const { text } = await generateText({
//     model: google("gemini-2.5-flash"),
//     system: buildFeedbackSystemPrompt({ userName, interviewInfo }),
//     prompt: JSON.stringify(formattedMessages),
//   });

//   return text;
// }
