"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileTextIcon,
  Loader2Icon,
  UploadIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from "lucide-react";

type Props = {
  onResumeReady: (summary: string) => void;
};

const ACCEPTED =
  ".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

export function ResumeUpload({ onResumeReady }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUploadAndScan = useCallback(async () => {
    if (!file) return;
    setScanning(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("resumeFile", file);

      const res = await fetch("/api/ai/resumes/extract", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to scan resume");
      }

      const { summary } = await res.json();
      onResumeReady(summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setScanning(false);
    }
  }, [file, onResumeReady]);

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl">Resume Interview</CardTitle>
          <CardDescription className="text-balance">
            Upload your resume to begin. The AI will scan it and then conduct a
            10-minute behavioural interview based on your experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="resume-file">Resume</Label>
            <Input
              id="resume-file"
              type="file"
              accept={ACCEPTED}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError(null);
              }}
            />
            <p className="text-xs text-muted-foreground">
              PDF, Word, or plain text — max 10 MB.
            </p>
          </div>

          {file && !scanning && (
            <div className="flex items-center gap-2 rounded-md border p-3 text-sm">
              <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{file.name}</span>
              <CheckCircleIcon className="ml-auto size-4 shrink-0 text-emerald-500" />
            </div>
          )}

          {error && (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangleIcon className="size-4" />
              {error}
            </p>
          )}

          <Button
            size="lg"
            disabled={!file || scanning}
            onClick={handleUploadAndScan}
            className="w-full"
          >
            {scanning ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Scanning resume…
              </>
            ) : (
              <>
                <UploadIcon className="size-4" />
                Scan & proceed to interview
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
