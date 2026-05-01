import { NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { professionLabelEn } from "@/lib/labels-en";
import { getPostHogClient } from "@/lib/posthog-server";
import { type InterviewUpdate } from "@/features/interviews/dal/mutations";
import { streamAiInterviewFeedback } from "@/services/ai/interviews/interviews";
import { normalizeFeedbackJsonString } from "@/features/interviews/lib/interview-feedback-json";
import { parseInterviewSubjectRef } from "@/features/interviews/lib/interview-subject-ref";
import { aiInterviewTitle } from "@/features/interviews/lib/interview-ai-title";
import { createAdminClient } from "@/supabase/server";
import { ADMIN_ROLE, OPERATOR_ROLE } from "@/features/auth/types";

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

  const supabase = await createAdminClient();

  // Authorization:
  // - admin: can regenerate feedback for any interview
  // - client: can regenerate feedback for interviews tied to screenings owned by their facility
  // - others: forbidden
  const { data: interview, error: interviewErr } = await supabase
    .from("interviews")
    .select("id, user_id, screening_id, subject_ref, hume_chat_id, chat_group_id, feedback_status, completed_at")
    .eq("id", interviewId)
    .maybeSingle();

  if (interviewErr && interviewErr.code !== "PGRST116") {
    return NextResponse.json({ error: interviewErr.message }, { status: 500 });
  }
  if (!interview) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  if (session.role === ADMIN_ROLE) {
    // ok
  } else if (session.role === OPERATOR_ROLE) {
    if (!session.facilityId || !interview.screening_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { data: screening } = await supabase
      .from("screenings")
      .select("id")
      .eq("id", interview.screening_id)
      .eq("facility_id", session.facilityId)
      .maybeSingle();
    if (!screening) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!interview.hume_chat_id) {
    return NextResponse.json(
      { error: "Interview has not been completed yet" },
      { status: 400 },
    );
  }

  // Mark generation started (only if previously failed/pending).
  try {
    await supabase
      .from("interviews")
      .update({ feedback_status: "generating" })
      .eq("id", interviewId);
  } catch {
    // Don't block streaming if status update fails.
  }

  const { data: worker } = await supabase
    .from("workers")
    .select("first_name, last_name, profession")
    .eq("user_id", interview.user_id)
    .maybeSingle();

  const userName =
    worker != null
      ? `${worker.first_name ?? ""} ${worker.last_name ?? ""}`.trim()
      : "";

  const subjectRef = parseInterviewSubjectRef(interview.subject_ref);
  const description = subjectRef.resumeSummary.trim().length > 0
    ? subjectRef.resumeSummary
    : "General interview practice session.";

  try {
    const result = await streamAiInterviewFeedback({
      humeChatId: interview.hume_chat_id,
      humeGroupChatId: interview.chat_group_id,
      interviewInfo: {
        title: aiInterviewTitle({
          screeningId: interview.screening_id,
          subjectRef: interview.subject_ref,
        }),
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
          await supabase
            .from("interviews")
            .update({
              feedback: parsed,
              feedback_status: "ready",
            })
            .eq("id", interviewId);

          const posthog = getPostHogClient();
          posthog?.capture({
            distinctId: interview.user_id,
            event: "interview_feedback_generated",
            properties: {
              interview_id: interviewId,
              interview_kind: interview.screening_id ? "screening" : "staff",
            },
          });
          await posthog?.shutdown();
        } catch (error) {
          console.error("[interview-feedback] failed to persist", error);
          await supabase
            .from("interviews")
            .update({ feedback_status: "failed" })
            .eq("id", interviewId);
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    await supabase
      .from("interviews")
      .update({ feedback_status: "failed" })
      .eq("id", interviewId);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate feedback" },
      { status: 500 },
    );
  }
}
