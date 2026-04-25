import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import ffmpeg from "fluent-ffmpeg";          
import * as fs from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { createAdminClient } from "@/services/supabase/server";
import { s3Api } from "@/services/s3/api";
import { analyzeInterviewVideoBuffer } from "@/services/ai/interviews/video-analysis";
import { tryAutoReview } from "@/features/interviews/services/auto-review";
import type { Json } from "@/services/supabase/types/database";
import { Readable } from "stream";

const payloadSchema = z.object({
  interviewId: z.string().min(1),
  userId: z.string().min(1),
  recordingKey: z.string().min(1),
});

function getMimeTypeExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/ogg": "ogv",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "video/x-matroska": "mkv",
  };
  return map[mimeType] ?? "mp4";
}

export const analyzeInterviewVideoTask = schemaTask({
  id: "interviews.analyze-video",
  schema: payloadSchema,
  maxDuration: 600,
  retry: {
    maxAttempts: 2,
  },
  run: async (payload) => {
    const { interviewId, userId, recordingKey } = payload;

    logger.log("Starting video analysis", { interviewId, userId, recordingKey });

    const supabase = await createAdminClient();

    // 1. Mark status as pending
    const { error: pendingError } = await supabase
      .from("interviews")
      .update({ video_feedback_status: "pending" })
      .eq("id", interviewId);

    if (pendingError) {
      throw new Error(`Failed to set video_feedback_status=pending: ${pendingError.message}`);
    }

    const result = await supabase.from("interviews").select("id").eq("id", interviewId).maybeSingle();
    if (!result.data) {
      throw new Error(`Interview not found: ${interviewId}`);
    }

    // Temp file paths
    let inputPath: string | null = null;
    let outputPath: string | null = null;

    try {
      // 2. Download video from S3
      logger.log("Downloading video from S3", { recordingKey });
      const download = await s3Api.download(recordingKey);

      // const chunks: Buffer[] = [];
      // for await (const chunk of download.stream) {
      //   chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      // }
      // const videoBuffer = Buffer.concat(chunks);

      // logger.log("Video downloaded", { bytes: videoBuffer.byteLength, mimeType: download.mimeType });

      // 3. Transcode with ffmpeg
      const tempDir = tmpdir();
      outputPath = join(tempDir, `interview-${interviewId}-compressed.mp4`);

      logger.log("Transcoding video", { inputPath, outputPath });

      await new Promise<void>((resolve, reject) => {
        ffmpeg(download.stream)
          .outputOptions([
            "-vf scale=854:480",
            "-an",               // no audio (matches your original flag)
            "-c:v libx264",
            "-preset fast",
            "-crf 28",
          ])
          .output(outputPath!)
          .on("end", () => resolve())
          .on("error", (err) => reject(err))
          .run();
      });

      // 4. Read compressed output
      const compressedBuffer = await fs.readFile(outputPath);
      logger.log("Transcoding complete", { compressedBytes: compressedBuffer.byteLength });

      // 5. Fetch worker profile photo for identity verification
      let profilePhoto: { buffer: Buffer; mimeType: string } | null = null;
      try {
        const { data: worker } = await supabase
          .from("workers")
          .select("photo_url")
          .eq("user_id", userId)
          .maybeSingle();

        if (worker?.photo_url) {
          logger.log("Fetching profile photo for identity verification", { photoKey: worker.photo_url });
          const photoDownload = await s3Api.download(worker.photo_url);
          const photoChunks: Buffer[] = [];
          for await (const chunk of photoDownload.stream) {
            photoChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          profilePhoto = {
            buffer: Buffer.concat(photoChunks),
            mimeType: photoDownload.mimeType || "image/jpeg",
          };
          logger.log("Profile photo fetched", { bytes: profilePhoto.buffer.byteLength });
        } else {
          logger.log("No profile photo found — identity check will be skipped");
        }
      } catch (photoErr) {
        // Non-fatal: proceed without identity check
        logger.warn("Failed to fetch profile photo, skipping identity verification", {
          error: photoErr instanceof Error ? photoErr.message : String(photoErr),
        });
      }

      // 6. Analyze with Gemini (video + optional profile photo)
      logger.log("Sending to Gemini for analysis", { hasProfilePhoto: profilePhoto != null });
      const analysisResult = await analyzeInterviewVideoBuffer(compressedBuffer, "video/mp4", profilePhoto);

      logger.log("Analysis complete", {
        confidence: analysisResult.confidence,
        flagCount: analysisResult.flags.length,
      });

      // 7. Persist results
      const { error: updateError } = await supabase
        .from("interviews")
        .update({
          video_feedback: analysisResult as unknown as Json,
          video_feedback_status: "completed",
        })
        .eq("id", interviewId);

      if (updateError) {
        throw new Error(`Failed to save video feedback: ${updateError.message}`);
      }

      logger.log("Video analysis saved", { interviewId });

      // 8. Attempt auto-review — non-fatal, runs only if feedback is also ready
      logger.log("Attempting auto-review after video analysis", { interviewId });
      await tryAutoReview(interviewId, userId);

      return {
        interviewId,
        confidence: analysisResult.confidence,
        flagCount: analysisResult.flags.length,
      };
    } catch (err) {
      // 8. On error: mark as failed
      logger.error("Video analysis failed, marking status=failed", {
        interviewId,
        error: err instanceof Error ? err.message : String(err),
      });

      await supabase
        .from("interviews")
        .update({ video_feedback_status: "failed" })
        .eq("id", interviewId);

      throw err;
    } finally {
      // Clean up temp files
      const cleanups = [inputPath, outputPath].filter(Boolean) as string[];
      await Promise.allSettled(cleanups.map((p) => fs.unlink(p)));
    }
  },
});
