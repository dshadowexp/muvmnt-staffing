import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPostHogClient } from "@/lib/posthog-server";
import { streamResumeKeyPoints } from "@/services/ai/resumes/resume-extract";
import arcjet, { fixedWindow } from "@/services/arcjet/client";

const aj = arcjet.withRule(
    fixedWindow({
        mode: "LIVE",
        window: "60s",
        max: 10,
    })
)


const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export async function POST(req: Request) {
  const decision = await aj.protect(req);
  if (decision.isDenied()) {
    return NextResponse.json(
      { error: "Rate limit exceeded", reason: decision.reason }, 
      { status: 429 }
    );
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("resumeFile");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "resumeFile is required" },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File must be under 10 MB" },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only PDF, Word, or plain text files are accepted" },
      { status: 400 },
    );
  }

  const buffer = await file.arrayBuffer();
  const summary = await streamResumeKeyPoints(buffer, file.type);

  const posthog = getPostHogClient();
  posthog?.capture({
    distinctId: session.userId,
    event: "resume_extracted",
    properties: {
      file_type: file.type,
      file_size_bytes: file.size,
    },
  });
  await posthog?.shutdown();

  return summary.toTextStreamResponse();
}
