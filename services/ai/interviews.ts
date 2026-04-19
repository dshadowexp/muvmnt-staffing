import { fetchChatMessages } from "../hume/lib/api"
import { generateText } from "ai"
import { google } from "./models/google"

/**
 * 
 * @param param0 
 * 
 * @returns 
 * 
 * Interviewee's name: ${userName}
Job title: ${interviewInfo.title}
Job description: ${interviewInfo.description}
Job Experience level: ${interviewInfo.experienceLevel}
 */

export async function generateAiInterviewFeedback({
  humeChatId,
  interviewInfo,
  userName,
}: {
  humeChatId: string
  interviewInfo: {
    title: string
    profession: string
    description: string
  }
  userName: string
}) {
  const messages = await fetchChatMessages(humeChatId)

  const formattedMessages = messages
    .map(message => {
      if (message.type !== "USER_MESSAGE" && message.type !== "AGENT_MESSAGE") {
        return null
      }
      if (message.messageText == null) return null

      return {
        speaker:
          message.type === "USER_MESSAGE" ? "interviewee" : "interviewer",
        text: message.messageText,
        emotionFeatures:
          message.role === "USER" ? message.emotionFeatures : undefined,
      }
    })
    .filter(f => f != null)

  const { text } = await generateText({
    model: google("gemini-2.5-flash"),
    prompt: JSON.stringify(formattedMessages),
    system: `You are an evaluation engine for a healthcare staffing agency. Your task is to assess an interview transcript and determine whether the candidate PASSES or FAILS.

You must be strict, objective, and risk-aware. In healthcare, unsafe candidates must NOT pass.

---

## INPUT PARAMETERS

* Candidate Name: ${userName}
* Interview Type: ${interviewInfo.title}
* Profession: ${interviewInfo.profession}

---

## OBJECTIVE

Evaluate whether {{candidate_name}} is safe, competent, and reliable enough to be placed in a healthcare role.

---

## EVALUATION FRAMEWORK

### IF INTERVIEW TYPE = CLINICAL

Score the candidate (0–5) in each category:

1. Clinical Knowledge

   * Understanding of procedures, protocols, and best practices

2. Patient Safety Awareness

   * Ability to identify risks and avoid harm

3. Critical Thinking & Decision-Making

   * Handles scenarios logically and safely

4. Communication Clarity

   * Clear, structured, and professional responses

5. Consistency & Accuracy

   * No contradictions or unsafe statements

---

### IF INTERVIEW TYPE = BEHAVIORAL

Score the candidate (0–5) in each category:

1. Communication Skills
2. Teamwork & Collaboration
3. Accountability & Ownership
4. Adaptability & Problem-Solving
5. Honesty & Consistency

---

## SCORING RULES

* 5 = ممتاز (excellent, no concerns)
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
* Gives vague answers with no real examples (behavioral)

---

## DECISION LOGIC

1. Compute the average score across all categories
2. Apply rules:

* If any category ≤ 1 → FAIL
* If average < 3 → FAIL
* Otherwise → PASS

---

## OUTPUT FORMAT (STRICT JSON)

Return ONLY valid JSON. No extra text.

{
  "candidate_name": "{{candidate_name}}",
  "interview_type": "{{interview_type}}",
  "decision": "PASS" | "FAIL",
  "average_score": number,
  "scores": {
    "category_1": number,
    "category_2": number,
    "category_3": number,
    "category_4": number,
    "category_5": number
  },
  "strengths": [
    "string",
    "string"
  ],
  "weaknesses": [
    "string",
    "string"
  ],
  "risk_flags": [
    "string"
  ],
  "summary": "Concise 2-4 sentence justification for the decision"
}

---

## CONSTRAINTS

* Be strict: this is healthcare, not a general job
* Do NOT be lenient to “borderline” candidates
* Base evaluation ONLY on the transcript
* Do NOT hallucinate missing information
* Keep reasoning concise and evidence-based

---

## GOAL

Ensure only candidates who are safe, competent, and reliable PASS. All others must FAIL.`,
  })

  return text
}