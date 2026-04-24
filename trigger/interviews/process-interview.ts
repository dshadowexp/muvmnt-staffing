import { logger, schemaTask, tasks } from "@trigger.dev/sdk/v3";
import { z } from "zod";

const payloadSchema = z.object({
  interviewId: z.string().min(1),
  userId: z.string().min(1),
  recordingKey: z.string().min(1),
});

export const processInterviewTask = schemaTask({
  id: "interviews.process",
  schema: payloadSchema,
  maxDuration: 30,
  retry: {
    maxAttempts: 1,
  },
  run: async (payload) => {
    const { interviewId, userId, recordingKey } = payload;

    logger.log("Triggering interview processing sub-tasks", { interviewId, userId });

    await Promise.all([
      tasks.trigger("interviews.generate-feedback", { interviewId, userId }),
      tasks.trigger("interviews.analyze-video", { interviewId, userId, recordingKey }),
    ]);

    logger.log("Interview sub-tasks triggered", { interviewId });

    return { interviewId, triggered: ["interviews.generate-feedback", "interviews.analyze-video"] };
  },
});
