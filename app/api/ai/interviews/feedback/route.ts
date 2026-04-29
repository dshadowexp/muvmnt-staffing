import { NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { professionLabelEn } from "@/lib/labels-en";
import { getPostHogClient } from "@/lib/posthog-server";
import { getInterviewByIdForUser } from "@/features/interviews/dal/queries";
import {
  updateInterviewByOwner,
  type InterviewUpdate,
} from "@/features/interviews/dal/mutations";
import { streamAiInterviewFeedback } from "@/services/ai/interviews/interviews";
import { normalizeFeedbackJsonString } from "@/features/interviews/lib/interview-feedback-json";
import { parseInterviewSubjectRef } from "@/features/interviews/lib/interview-subject-ref";
import { createAdminClient } from "@/services/supabase/server";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { interviewId?: unknown };
  try {
    body = (await req.json()) as { interviewId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const interviewId =
    typeof body.interviewId === "string" ? body.interviewId : null;
  if (interviewId == null) {
    return NextResponse.json(
      { error: "interviewId is required" },
      { status: 400 },
    );
  }

  const interview = await getInterviewByIdForUser(interviewId, session.userId);
  if (interview == null) {
    return NextResponse.json(
      { error: "Interview not found" },
      { status: 404 },
    );
  }
  if (!interview.hume_chat_id) {
    return NextResponse.json(
      { error: "Interview has not been completed yet" },
      { status: 400 },
    );
  }

  const supabase = await createAdminClient();
  const { data: worker } = await supabase
    .from("workers")
    .select("first_name, last_name, profession")
    .eq("user_id", session.userId)
    .maybeSingle();

  const userName =
    worker != null
      ? `${worker.first_name ?? ""} ${worker.last_name ?? ""}`.trim()
      : "";

  const subjectRef = parseInterviewSubjectRef(interview.subject_ref);
  const description = subjectRef.resumeSummary.trim().length > 0
    ? subjectRef.resumeSummary
    : "General interview practice session.";

  const result = await streamAiInterviewFeedback({
    humeChatId: interview.hume_chat_id,
    humeGroupChatId: interview.chat_group_id,
    interviewInfo: {
      title: interview.subject.replace(/_/g, " "),
      profession: subjectRef.profession.trim().length > 0
        ? subjectRef.profession
        : worker?.profession?.trim() ? professionLabelEn(worker.profession) : "General",
      description,
    },
    userName: userName.length > 0 ? userName : "Candidate",
    onFinish: async ({ text }) => {
      if (!text || text.trim().length === 0) return;
      try {
        const normalized = normalizeFeedbackJsonString(text);
        const parsed = JSON.parse(normalized) as InterviewUpdate["feedback"];
        await updateInterviewByOwner(interviewId, session.userId, {
          feedback: parsed,
        });

        const posthog = getPostHogClient();
        posthog?.capture({
          distinctId: session.userId,
          event: "interview_feedback_generated",
          properties: {
            interview_id: interviewId,
            subject: interview.subject,
          },
        });
        await posthog?.shutdown();
      } catch (error) {
        console.error("[interview-feedback] failed to persist", error);
      }
    },
  });

  return result.toTextStreamResponse();
}
