import "server-only";
import { z } from "zod";
import { env } from "@/data/env/server";

// ─── Zod schemas (single source of truth for types + response validation) ──────

const FLAG_TYPES = [
  "MULTIPLE_FACES",
  "OFF_CAMERA_GAZE",
  "VISIBLE_SCREEN_OR_NOTES",
  "EARBUD_DETECTED",
  "OTHER_PERSON_IN_BACKGROUND",
  "IDENTITY_MISMATCH",
  "OTHER",
] as const;

const VideoAnalysisFlagSchema = z.object({
  type: z.enum(FLAG_TYPES),
  description: z.string(),
  timestampSeconds: z.number().optional(),
});

const IdentityMatchSchema = z.object({
  verdict: z.enum(["match", "uncertain", "no_match"]),
  confidence: z.enum(["low", "medium", "high"]),
  rationale: z.string(),
});

const VideoAnalysisResultSchema = z.object({
  confidence: z.enum(["low", "medium", "high"]),
  flags: z.array(VideoAnalysisFlagSchema),
  summary: z.string(),
  identityMatch: IdentityMatchSchema.optional(),
});

export type VideoAnalysisFlag = z.infer<typeof VideoAnalysisFlagSchema>;
export type IdentityMatch = z.infer<typeof IdentityMatchSchema>;
export type VideoAnalysisResult = z.infer<typeof VideoAnalysisResultSchema>;

// ─── Gemini response schemas (OpenAPI 3.0 subset accepted by the API) ──────────

const FLAG_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: FLAG_TYPES },
    description: { type: "string" },
    timestampSeconds: { type: "number" },
  },
  required: ["type", "description"],
};

const IDENTITY_MATCH_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["match", "uncertain", "no_match"] },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    rationale: { type: "string" },
  },
  required: ["verdict", "confidence", "rationale"],
};

/** Response schema used when no profile photo is supplied. */
const RESPONSE_SCHEMA_NO_PHOTO = {
  type: "object",
  properties: {
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    flags: { type: "array", items: FLAG_SCHEMA },
    summary: { type: "string" },
  },
  required: ["confidence", "flags", "summary"],
};

/** Response schema used when a profile photo is supplied — identityMatch is required. */
const RESPONSE_SCHEMA_WITH_PHOTO = {
  type: "object",
  properties: {
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    flags: { type: "array", items: FLAG_SCHEMA },
    summary: { type: "string" },
    identityMatch: IDENTITY_MATCH_SCHEMA,
  },
  required: ["confidence", "flags", "summary", "identityMatch"],
};

// ─── Gemini File API helpers ──────────────────────────────────────────────────

const GEMINI_API_KEY = () => env.GEMINI_API_KEY;
const UPLOAD_BASE =
  "https://generativelanguage.googleapis.com/upload/v1beta/files";
const GENERATE_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

async function uploadFileToGemini(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const apiKey = GEMINI_API_KEY();
  const numBytes = buffer.byteLength;

  // Step 1: Initiate resumable upload
  const initiateRes = await fetch(
    `${UPLOAD_BASE}?uploadType=resumable&key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(numBytes),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { display_name: "interview-video" } }),
    },
  );

  if (!initiateRes.ok) {
    const text = await initiateRes.text();
    throw new Error(
      `Gemini upload initiation failed (${initiateRes.status}): ${text}`,
    );
  }

  const uploadUrl = initiateRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) {
    throw new Error("Gemini upload URL missing from initiation response");
  }

  // Step 2: Upload the bytes
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(numBytes),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: buffer as unknown as BodyInit,
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(
      `Gemini file upload failed (${uploadRes.status}): ${text}`,
    );
  }

  const uploadData = (await uploadRes.json()) as {
    file?: { uri?: string; name?: string; state?: string };
  };

  const fileUri = uploadData?.file?.uri;
  if (!fileUri) {
    throw new Error("Gemini upload response missing file URI");
  }

  return fileUri;
}

async function waitForFileActive(fileUri: string): Promise<void> {
  const apiKey = GEMINI_API_KEY();
  const fileNameMatch = fileUri.match(/files\/([^/?]+)/);
  if (!fileNameMatch)
    throw new Error(`Cannot parse file name from URI: ${fileUri}`);
  const fileName = fileNameMatch[1];

  const maxTries = 10;
  const delayMs = 3_000;

  for (let attempt = 0; attempt < maxTries; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${apiKey}`,
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Gemini file state check failed (${res.status}): ${text}`,
      );
    }

    const data = (await res.json()) as { state?: string };

    if (data.state === "ACTIVE") return;
    if (data.state === "FAILED") throw new Error("Gemini file processing failed");

    if (attempt < maxTries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error("Gemini file did not become ACTIVE within the polling timeout");
}

async function deleteGeminiFile(fileUri: string): Promise<void> {
  const apiKey = GEMINI_API_KEY();
  const fileNameMatch = fileUri.match(/files\/([^/?]+)/);
  if (!fileNameMatch) return; // nothing to delete if URI is unparseable

  const fileName = fileNameMatch[1];
  await fetch(
    `https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${apiKey}`,
    { method: "DELETE" },
  );
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const CHEATING_DETECTION_INSTRUCTIONS = `
CHEATING DETECTION — look for:
1. Multiple faces visible in the frame at any point
2. Sustained off-camera gaze lasting more than 10 seconds
3. Visible screens, monitors, phones, or written notes beside/behind the candidate
4. Earbuds, earphones, or in-ear devices in the candidate's ears
5. Other people visible in the background or entering/leaving the frame`.trim();

/**
 * Prompt used when a reference profile photo is available.
 * The photo is passed as the first inline_data part; the video follows.
 */
const ANALYSIS_PROMPT_WITH_PHOTO = `You are a proctoring AI for a remote video interview.

You have been provided with:
1. A reference profile photo of the registered candidate (the FIRST image/inline data)
2. The interview video recording (the file_data part)

Your task has two parts:

--- PART 1: IDENTITY VERIFICATION ---
Compare the face in the reference profile photo with the dominant face(s) in the video.
Determine if the person who appears in the video is the same person as in the profile photo.

Identity verdict rules:
- "match": The facial features, skin tone, and overall appearance are clearly consistent.
- "uncertain": Some features are similar but lighting, angle, or video quality prevent a confident conclusion.
- "no_match": The person in the video is clearly a different individual from the profile photo.

--- PART 2: ${CHEATING_DETECTION_INSTRUCTIONS} ---

Guidance:
- Set the top-level "confidence" to the highest risk level found across identity or cheating checks.
- If identity is uncertain or no_match, add an "IDENTITY_MISMATCH" flag entry.
- Do NOT invent flags. Only report what you can clearly see.
- If no issues are found, return an empty flags array.`;

/**
 * Prompt used when no reference photo is available (identity check skipped).
 */
const ANALYSIS_PROMPT_NO_PHOTO = `You are a proctoring AI for a remote video interview. Analyze this interview recording for potential cheating indicators.

${CHEATING_DETECTION_INSTRUCTIONS}

Guidance:
- Set confidence to "high" when you have clear visual evidence of a flag.
- Set confidence to "medium" when indicators are present but ambiguous.
- Set confidence to "low" when video quality or angle limits your assessment or no issues were found.
- If no cheating indicators are found, return an empty flags array with an appropriate summary.
- Do NOT invent flags. Only report what you can clearly see.`;

// ─── Main export ─────────────────────────────────────────────────────────────

export async function analyzeInterviewVideoBuffer(
  buffer: Buffer,
  mimeType: string,
  profilePhoto?: { buffer: Buffer; mimeType: string } | null,
): Promise<VideoAnalysisResult> {
  const fallback: VideoAnalysisResult = {
    confidence: "low",
    flags: [],
    summary: "Video analysis could not be completed.",
  };

  const hasPhoto = profilePhoto != null && profilePhoto.buffer.byteLength > 0;

  // Hoisted so the finally block can delete the file regardless of outcome.
  let fileUri: string | null = null;

  try {
    // Upload video to Gemini Files API
    fileUri = await uploadFileToGemini(buffer, mimeType);
    await waitForFileActive(fileUri);

    // Build the parts array — photo (inline_data) first when available, then video
    type GeminiPart =
      | { text: string }
      | { file_data: { mime_type: string; file_uri: string } }
      | { inline_data: { mime_type: string; data: string } };

    const parts: GeminiPart[] = [];

    if (hasPhoto) {
      parts.push({
        inline_data: {
          mime_type: profilePhoto!.mimeType,
          data: profilePhoto!.buffer.toString("base64"),
        },
      });
    }

    parts.push({ file_data: { mime_type: mimeType, file_uri: fileUri } });
    parts.push({ text: hasPhoto ? ANALYSIS_PROMPT_WITH_PHOTO : ANALYSIS_PROMPT_NO_PHOTO });

    const apiKey = GEMINI_API_KEY();
    const generateRes = await fetch(`${GENERATE_BASE}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: hasPhoto ? RESPONSE_SCHEMA_WITH_PHOTO : RESPONSE_SCHEMA_NO_PHOTO,
        },
      }),
    });

    if (!generateRes.ok) {
      const text = await generateRes.text();
      console.error(
        `[video-analysis] generateContent failed (${generateRes.status}): ${text}`,
      );
      return fallback;
    }

    const generateData = (await generateRes.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const rawText =
      generateData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!rawText.trim()) {
      console.error("[video-analysis] Empty response from Gemini");
      return fallback;
    }

    // responseSchema guarantees valid JSON matching the schema — parse and validate directly.
    const parsed = VideoAnalysisResultSchema.parse(JSON.parse(rawText));
    return parsed;
  } catch (err) {
    console.error(
      "[video-analysis] Unexpected error during video analysis",
      err,
    );
    return fallback;
  } finally {
    // Always delete the uploaded file from Gemini's Files API — non-fatal.
    if (fileUri) {
      deleteGeminiFile(fileUri).catch((err) =>
        console.warn("[video-analysis] Failed to delete Gemini file", { fileUri, err }),
      );
    }
  }
}
