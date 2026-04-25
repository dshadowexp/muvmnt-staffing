import "server-only";
import { env } from "@/data/env/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VideoAnalysisFlag = {
  type: string;
  description: string;
  timestampSeconds?: number;
};

export type IdentityMatch = {
  /** Whether the person in the video matches the registered candidate's profile photo. */
  verdict: "match" | "uncertain" | "no_match";
  /** How confident Gemini is in this verdict. */
  confidence: "low" | "medium" | "high";
  /** A brief, factual rationale for the verdict. */
  rationale: string;
};

export type VideoAnalysisResult = {
  /** Overall integrity risk level for this session. */
  confidence: "low" | "medium" | "high";
  flags: VideoAnalysisFlag[];
  summary: string;
  /** Present only when a reference profile photo was supplied. */
  identityMatch?: IdentityMatch;
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

// ─── Prompts ──────────────────────────────────────────────────────────────────

const CHEATING_DETECTION_INSTRUCTIONS = `
CHEATING DETECTION — look for:
1. Multiple faces visible in the frame at any point
2. Sustained off-camera gaze lasting more than 10 seconds
3. Visible screens, monitors, phones, or written notes beside/behind the candidate
4. Earbuds, earphones, or in-ear devices in the candidate's ears
5. Other people visible in the background or entering/leaving the frame`.trim();

const FLAG_TYPES =
  `"MULTIPLE_FACES" | "OFF_CAMERA_GAZE" | "VISIBLE_SCREEN_OR_NOTES" | "EARBUD_DETECTED" | "OTHER_PERSON_IN_BACKGROUND" | "IDENTITY_MISMATCH" | "OTHER"`;

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

Respond ONLY with valid JSON matching this exact structure:
{
  "confidence": "low" | "medium" | "high",
  "identityMatch": {
    "verdict": "match" | "uncertain" | "no_match",
    "confidence": "low" | "medium" | "high",
    "rationale": "One or two factual sentences explaining your verdict"
  },
  "flags": [
    {
      "type": ${FLAG_TYPES},
      "description": "Brief factual description of what was observed",
      "timestampSeconds": <number or omit if not applicable>
    }
  ],
  "summary": "2-3 sentence overall assessment of session integrity, referencing both identity and cheating checks"
}

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

Respond ONLY with valid JSON matching this exact structure:
{
  "confidence": "low" | "medium" | "high",
  "flags": [
    {
      "type": ${FLAG_TYPES},
      "description": "Brief factual description of what was observed",
      "timestampSeconds": <number or omit if not applicable>
    }
  ],
  "summary": "2-3 sentence overall assessment of the integrity of this interview session"
}

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

  try {
    // Upload video to Gemini Files API
    const fileUri = await uploadFileToGemini(buffer, mimeType);
    await waitForFileActive(fileUri);

    // Build the parts array — photo (inline_data) first when available, then video
    type GeminiPart =
      | { text: string }
      | { file_data: { mime_type: string; file_uri: string } }
      | { inline_data: { mime_type: string; data: string } };

    const parts: GeminiPart[] = [];

    if (hasPhoto) {
      // Encode profile photo as base64 inline image
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

    try {
      const cleaned = rawText
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

      const parsed = JSON.parse(cleaned) as Partial<VideoAnalysisResult> & {
        identityMatch?: Partial<IdentityMatch>;
      };

      const confidence =
        parsed.confidence === "high" ||
        parsed.confidence === "medium" ||
        parsed.confidence === "low"
          ? parsed.confidence
          : "low";

      const flags = Array.isArray(parsed.flags)
        ? parsed.flags.filter(
            (f): f is VideoAnalysisFlag =>
              typeof f === "object" &&
              f !== null &&
              typeof f.type === "string" &&
              typeof f.description === "string",
          )
        : [];

      const summary =
        typeof parsed.summary === "string" && parsed.summary.trim().length > 0
          ? parsed.summary.trim()
          : "Analysis completed.";

      let identityMatch: IdentityMatch | undefined;
      if (hasPhoto && parsed.identityMatch != null) {
        const im = parsed.identityMatch;
        const verdict =
          im.verdict === "match" ||
          im.verdict === "uncertain" ||
          im.verdict === "no_match"
            ? im.verdict
            : "uncertain";
        const imConfidence =
          im.confidence === "high" ||
          im.confidence === "medium" ||
          im.confidence === "low"
            ? im.confidence
            : "low";
        const rationale =
          typeof im.rationale === "string" && im.rationale.trim().length > 0
            ? im.rationale.trim()
            : "No rationale provided.";
        identityMatch = { verdict, confidence: imConfidence, rationale };
      }

      return { confidence, flags, summary, identityMatch };
    } catch (parseErr) {
      console.error(
        "[video-analysis] Failed to parse Gemini JSON response",
        parseErr,
        rawText,
      );
      return {
        confidence: "low",
        flags: [],
        summary: "Analysis response could not be parsed.",
      };
    }
  } catch (err) {
    console.error(
      "[video-analysis] Unexpected error during video analysis",
      err,
    );
    return fallback;
  }
}
