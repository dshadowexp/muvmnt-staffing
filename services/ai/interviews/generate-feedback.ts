import "server-only";
import { generateObject } from "ai";
import { google } from "@/services/ai/models/google";
import { fetchChatMessages } from "@/services/hume/lib/api";
import { interviewFeedbackSchema, type InterviewFeedback } from "./schema";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers (mirrored from interviews.ts) ───────────────────────────────────

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

This is a COMBINED interview. Score the candidate across ALL TEN categories below, in this exact order.

### SECTION A — CLINICAL (categories 1–5)

1. Clinical Knowledge — Understanding of procedures, protocols, and best practices
2. Patient Safety Awareness — Ability to identify risks and avoid harm
3. Critical Thinking & Decision-Making — Handles scenarios logically and safely
4. Communication Clarity — Clear, structured, professional responses
5. Consistency & Accuracy — No contradictions or unsafe statements

### SECTION B — BEHAVIORAL (categories 6–10)

6. Communication Skills — Listens well, articulates clearly, adapts tone
7. Teamwork & Collaboration — Works with colleagues, escalates appropriately
8. Accountability & Ownership — Takes responsibility, acknowledges mistakes
9. Adaptability & Problem-Solving — Handles pressure and unexpected situations
10. Honesty & Consistency — Answers align across the interview, no evasion

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
* Gives vague answers with no real examples in the behavioral section

---

## DECISION LOGIC

1. Compute the average score across all ten categories
2. Apply rules:
   * If any category score is <= 1 → FAIL
   * If average < 3 → FAIL
   * Otherwise → PASS

---

## OUTPUT CONTRACT

Return ONLY the structured object the system expects. The structure MUST match the schema provided by the tool:

- \`candidate_name\`: the candidate's full name (use "${userName}" unless the transcript clearly overrides it)
- \`interview_type\`: always "COMBINED"
- \`decision\`: "PASS" or "FAIL"
- \`average_score\`: mean of all ten category scores, one decimal place acceptable
- \`scores\`: array of exactly TEN objects \`{ label, score }\`. Labels MUST match the rubric order above (clinical 1–5 first, behavioral 6–10 second). Scores are integers 0–5.
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

// ─── Main export ─────────────────────────────────────────────────────────────

export async function generateInterviewFeedbackObject(params: {
  humeChatId: string;
  humeGroupChatId: string | null;
  interviewInfo: { title: string; profession: string; description: string };
  userName: string;
}): Promise<InterviewFeedback> {
  const { humeChatId, humeGroupChatId, interviewInfo, userName } = params;

  const formattedMessages = await loadFormattedMessages(humeChatId, humeGroupChatId);

  const { object } = await generateObject({
    model: google("gemini-2.5-flash"),
    schema: interviewFeedbackSchema,
    system: buildFeedbackSystemPrompt({ userName, interviewInfo }),
    prompt: JSON.stringify(formattedMessages),
  });

  return object;
}
