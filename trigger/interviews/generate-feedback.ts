import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";

import { createAdminClient } from "@/services/supabase/server";
import { generateInterviewFeedbackObject } from "@/services/ai/interviews/generate-feedback";
import { parseInterviewSubjectRef } from "@/features/interviews/lib/interview-subject-ref";
import { professionLabelEn } from "@/lib/labels-en";
import { tryAutoReview } from "@/features/interviews/services/auto-review";
import type { Json } from "@/services/supabase/types/database";

const payloadSchema = z.object({
  interviewId: z.string().min(1),
  userId: z.string().min(1),
});

export const generateInterviewFeedbackTask = schemaTask({
  id: "interviews.generate-feedback",
  schema: payloadSchema,
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
  },
  run: async (payload) => {
    const { interviewId, userId } = payload;

    logger.log("Generating interview feedback", { interviewId, userId });

    const supabase = await createAdminClient();

    // 1. Load interview row
    const { data: interview, error: interviewError } = await supabase
      .from("interviews")
      .select("id, hume_chat_id, chat_group_id, subject, subject_ref, user_id")
      .eq("id", interviewId)
      .maybeSingle();

    if (interviewError) {
      throw new Error(`Failed to load interview: ${interviewError.message}`);
    }
    if (!interview) {
      throw new Error(`Interview not found: ${interviewId}`);
    }
    if (interview.user_id !== userId) {
      throw new Error(`Interview ${interviewId} does not belong to user ${userId}`);
    }
    if (!interview.hume_chat_id) {
      throw new Error("Interview has no hume_chat_id — cannot generate feedback");
    }

    // 2. Load worker
    const { data: worker } = await supabase
      .from("workers")
      .select("first_name, last_name, profession")
      .eq("user_id", userId)
      .maybeSingle();

    const userName =
      worker != null
        ? `${worker.first_name ?? ""} ${worker.last_name ?? ""}`.trim()
        : "Candidate";

    const subjectRef = parseInterviewSubjectRef(interview.subject_ref);
    const description =
      subjectRef.resumeSummary.trim().length > 0
        ? subjectRef.resumeSummary
        : subjectRef.professionContext.trim().length > 0
          ? subjectRef.professionContext
          : "General interview practice session.";

    const interviewInfo = {
      title: interview.subject.replace(/_/g, " "),
      profession:
        worker?.profession?.trim()
          ? professionLabelEn(worker.profession)
          : "General",
      description,
    };

    logger.log("Calling AI feedback generator", { interviewId, userName, interviewInfo });

    // 3. Generate feedback
    const result = await generateInterviewFeedbackObject({
      humeChatId: interview.hume_chat_id,
      humeGroupChatId: interview.chat_group_id ?? null,
      interviewInfo,
      userName: userName.length > 0 ? userName : "Candidate",
    });

    // 4. Persist feedback on interview row
    const { error: updateError } = await supabase
      .from("interviews")
      .update({ feedback: result as unknown as Json })
      .eq("id", interviewId);

    if (updateError) {
      throw new Error(`Failed to save feedback: ${updateError.message}`);
    }

    logger.log("Interview feedback saved", { interviewId, decision: result.decision });

    // Attempt auto-review — non-fatal, runs only if video analysis is also ready
    logger.log("Attempting auto-review after feedback generation", { interviewId });
    await tryAutoReview(interviewId, userId);

    return { interviewId, decision: result.decision };
  },
});
