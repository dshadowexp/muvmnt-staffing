"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileTextIcon,
  Loader2Icon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import type { DeepPartial } from "ai";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  aiSummarySchema,
  type ResumeSummary,
} from "@/services/ai/resumes/schema";
import {
  uploadFileToStorage,
  getFilenameFromKey,
} from "@/features/storage/components/file-input";
import { deleteFile } from "@/features/storage/dal/mutations";
import {
  parseInterviewSubjectRef,
  RESUME_UPLOAD_LIMIT,
  type InterviewSubjectRef,
} from "@/features/interviews/lib/interview-subject-ref";
import type { InterviewRow } from "@/features/interviews/dal/queries";
import {
  bumpInterviewSubjectRefUpload,
  clearInterviewSubjectRefFile,
  createAssessmentInterview,
  updateInterviewSubjectRefBody,
} from "@/features/interviews/actions";

type SummaryShape = DeepPartial<ResumeSummary>;

type ResumeReadyPayload = {
  interviewId: string;
  ref: InterviewSubjectRef;
};

type ExistingFile = {
  key: string;
  name: string;
};

type Props = {
  existingInterview: InterviewRow | null;
  onResumeReady: (payload: ResumeReadyPayload) => void;
};

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function tryParseSummary(body: string): SummaryShape | null {
  if (body.trim().length === 0) return null;
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as SummaryShape;
    }
  } catch {
    // Legacy plain-text body — surface it as a degraded summary so the user
    // can still proceed, but skip strict shape validation.
    return { careerProgression: body } as SummaryShape;
  }
  return null;
}

function hydrateExisting(existingInterview: InterviewRow | null): {
  file: ExistingFile | null;
  interviewId: string | null;
  summary: SummaryShape | null;
  limit: number;
} {
  if (existingInterview == null) {
    return { file: null, interviewId: null, summary: null, limit: 0 };
  }
  const ref = parseInterviewSubjectRef(existingInterview.subject_ref);
  if (ref.key.length === 0) {
    return {
      file: null,
      interviewId: existingInterview.id,
      summary: null,
      limit: ref.limit,
    };
  }
  return {
    file: { key: ref.key, name: getFilenameFromKey(ref.key) },
    interviewId: existingInterview.id,
    summary: tryParseSummary(ref.body),
    limit: ref.limit,
  };
}

const LIMIT_REACHED_MESSAGE = `You've reached the maximum of ${RESUME_UPLOAD_LIMIT} resume changes. You can no longer change your resume.`;

export function ResumeUpload({ existingInterview, onResumeReady }: Props) {
  const t = useTranslations("assessments.interview.resume");
  const initial = useRef(hydrateExisting(existingInterview)).current;

  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingFile, setExistingFile] = useState<ExistingFile | null>(
    initial.file,
  );
  const [resumeKey, setResumeKey] = useState<string | null>(
    initial.file?.key ?? null,
  );
  const [interviewId, setInterviewId] = useState<string | null>(
    initial.interviewId,
  );
  const [pinnedSummary, setPinnedSummary] = useState<SummaryShape | null>(
    initial.summary,
  );
  const [uploadLimit, setUploadLimit] = useState<number>(initial.limit);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const fileRef = useRef<File | null>(null);
  // Mirror in a ref so async hook callbacks (onFinish) see the latest id
  // without needing to be re-created on every state change.
  const interviewIdRef = useRef<string | null>(initial.interviewId);

  const {
    object: aiSummary,
    isLoading: isSummarizing,
    submit: generateSummary,
    stop: stopSummary,
    clear: clearSummary,
  } = useObject({
    api: "/api/ai/resumes/extract",
    schema: aiSummarySchema,
    fetch: (url, options) => {
      const headers = new Headers(options?.headers);
      headers.delete("Content-Type");

      const formData = new FormData();
      if (fileRef.current) {
        formData.append("resumeFile", fileRef.current);
      }

      return fetch(url, { ...options, headers, body: formData });
    },
    onFinish: async ({ object }) => {
      const id = interviewIdRef.current;
      if (id == null || object == null) return;

      const res = await updateInterviewSubjectRefBody(
        id,
        JSON.stringify(object),
      );
      if (res.error) {
        toast.error(res.message);
      }
    },
  });

  const summary: SummaryShape | null = aiSummary ?? pinnedSummary;
  const hasSummary = summary != null;
  const displayFile: { name: string; size?: number } | null = selectedFile
    ? { name: selectedFile.name, size: selectedFile.size }
    : existingFile
      ? { name: existingFile.name }
      : null;
  const ready =
    !isUploading &&
    !isSummarizing &&
    !!resumeKey &&
    !!interviewId &&
    hasSummary;

  async function handleFileUpload(file: File | null) {
    if (file == null) return;

    if (file.size > MAX_BYTES) {
      toast.error("File size exceeds 10MB limit");
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error("Please upload a PDF, Word document, or text file");
      return;
    }

    const previousKey = resumeKey;
    const existingId = interviewIdRef.current;

    fileRef.current = file;
    setSelectedFile(file);
    setExistingFile(null);
    setResumeKey(null);
    setPinnedSummary(null);
    setIsUploading(true);
    generateSummary(null);

    try {
      const { key } = await uploadFileToStorage({
        file,
        context: "resumes",
      });
      setResumeKey(key);

      if (existingId != null) {
        const bumped = await bumpInterviewSubjectRefUpload(existingId, key);
        if (bumped.error) {
          if (bumped.reason === "limit_reached") {
            toast.info(LIMIT_REACHED_MESSAGE);
          } else {
            toast.error(bumped.message);
          }
          await deleteFile(key).catch(() => undefined);
          return;
        }
        setUploadLimit(bumped.limit);
        if (previousKey && previousKey !== key) {
          deleteFile(previousKey).catch(() => undefined);
        }
      } else {
        const created = await createAssessmentInterview({
          subject: "resume",
          subjectRef: { key, body: "", limit: 1 },
        });
        if (created.error) {
          toast.error(created.message);
          return;
        }
        interviewIdRef.current = created.id;
        setInterviewId(created.id);
        setUploadLimit(1);
      }
    } catch {
      toast.error("Failed to upload your resume. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemove() {
    if (uploadLimit >= RESUME_UPLOAD_LIMIT) {
      toast.info(LIMIT_REACHED_MESSAGE);
      return;
    }

    const idToDelete = interviewIdRef.current;
    setIsRemoving(true);
    stopSummary();
    const keyToDelete = resumeKey;

    try {
      if (idToDelete) {
        const res = await clearInterviewSubjectRefFile(idToDelete);
        if (res.error) {
          if (res.reason === "limit_reached") {
            toast.info(LIMIT_REACHED_MESSAGE);
          } else {
            toast.error(res.message);
          }
          return;
        }
      }
      if (keyToDelete) {
        await deleteFile(keyToDelete).catch(() => undefined);
      }
      fileRef.current = null;
      clearSummary();
      setSelectedFile(null);
      setExistingFile(null);
      setResumeKey(null);
      setPinnedSummary(null);
      setIsUploading(false);
    } catch {
      toast.error("Failed to remove file from storage.");
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col p-4">
      <div className="flex justify-end gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        {displayFile == null ? (
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="text-xl">{t("uploadTitle")}</CardTitle>
              <CardDescription className="text-balance">
                {t("uploadDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dropzone
                isDragOver={isDragOver}
                setIsDragOver={setIsDragOver}
                onFile={handleFileUpload}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-2xl">
            <CardHeader className="gap-4">
              <FileRow
                name={displayFile.name}
                size={displayFile.size}
                isUploading={isUploading}
                isRemoving={isRemoving}
                isUploaded={!!resumeKey}
                isSummarizing={isSummarizing}
                onRemove={handleRemove}
              />
              <CandidateHeader summary={summary} isStreaming={isSummarizing} />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <SummaryAccordion
                summary={summary}
                isStreaming={isSummarizing}
              />
              <Button
                size="lg"
                disabled={!ready}
                onClick={() => {
                  if (
                    !ready ||
                    resumeKey == null ||
                    interviewId == null ||
                    summary == null
                  ) {
                    return;
                  }
                  onResumeReady({
                    interviewId,
                    ref: {
                      key: resumeKey,
                      body: JSON.stringify(summary),
                      limit: uploadLimit,
                    },
                  });
                }}
                className="w-full"
              >
                {!ready && !isRemoving && (
                  <Loader2Icon className="size-4 animate-spin" aria-hidden />
                )}
                Proceed to interview
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Dropzone({
  isDragOver,
  setIsDragOver,
  onFile,
}: {
  isDragOver: boolean;
  setIsDragOver: (value: boolean) => void;
  onFile: (file: File | null) => void;
}) {
  return (
    <div
      className={cn(
        "relative rounded-lg border-2 border-dashed p-6 transition-colors",
        isDragOver
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/40 bg-muted/10",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        onFile(e.dataTransfer.files[0] ?? null);
      }}
    >
      <label htmlFor="resume-upload" className="sr-only">
        Resume file
      </label>
      <input
        id="resume-upload"
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <UploadIcon className="size-10 text-muted-foreground" />
        <p className="text-sm">
          Drag and drop your resume here, or click to upload
        </p>
        <p className="text-xs text-muted-foreground">
          PDF, Word, or plain text · up to 10 MB
        </p>
      </div>
    </div>
  );
}

function FileRow({
  name,
  size,
  isUploading,
  isRemoving,
  isUploaded,
  isSummarizing,
  onRemove,
}: {
  name: string;
  size?: number;
  isUploading: boolean;
  isRemoving: boolean;
  isUploaded: boolean;
  isSummarizing: boolean;
  onRemove: () => void;
}) {
  const status = isRemoving
    ? "Removing…"
    : isUploading
      ? "Uploading…"
      : isUploaded
        ? "Uploaded"
        : "Selected";
  const sizeLabel = size != null ? `${formatBytes(size)} · ` : "";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-input/30 px-3 py-2.5",
        isUploaded && "border-primary/25 bg-primary/5",
      )}
    >
      <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{name}</span>
        <span className="text-xs text-muted-foreground">
          {sizeLabel}
          {status}
        </span>
      </div>
      {(isUploading || isRemoving) && (
        <Loader2Icon className="size-4 shrink-0 animate-spin text-primary" />
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={isRemoving || isUploading || isSummarizing}
        onClick={onRemove}
        title="Remove file"
        aria-label="Remove file"
      >
        <Trash2Icon className="size-4" />
      </Button>
    </div>
  );
}

function CandidateHeader({
  summary,
  isStreaming,
}: {
  summary: SummaryShape | null;
  isStreaming: boolean;
}) {
  if (summary == null && !isStreaming) return null;

  const name = summary?.candidate?.name;
  const role = summary?.candidate?.currentRole;
  const years = summary?.candidate?.yearsOfExperience;

  return (
    <div className="flex flex-col gap-1">
      {name ? (
        <span className="text-base font-semibold">{name}</span>
      ) : (
        <Skeleton className="h-5 w-40" />
      )}
      {role || years ? (
        <span className="text-sm text-muted-foreground">
          {[role, years].filter(Boolean).join(" · ")}
        </span>
      ) : (
        <Skeleton className="h-4 w-56" />
      )}
    </div>
  );
}

type SectionConfig = {
  id: string;
  title: string;
  hasContent: (summary: SummaryShape | null) => boolean;
  render: (summary: SummaryShape | null) => ReactNode;
};

const SUMMARY_SECTIONS: SectionConfig[] = [
  {
    id: "skills",
    title: "Key skills",
    hasContent: (s) => (s?.keySkills?.length ?? 0) > 0,
    render: (s) => <TagList items={s?.keySkills} />,
  },
  {
    id: "achievements",
    title: "Notable achievements",
    hasContent: (s) => (s?.notableAchievements?.length ?? 0) > 0,
    render: (s) => <BulletList items={s?.notableAchievements} />,
  },
  {
    id: "progression",
    title: "Career progression",
    hasContent: (s) => (s?.careerProgression?.length ?? 0) > 0,
    render: (s) => <Paragraph value={s?.careerProgression} />,
  },
  {
    id: "education",
    title: "Education",
    hasContent: (s) => (s?.education?.length ?? 0) > 0,
    render: (s) => <Paragraph value={s?.education} />,
  },
  {
    id: "certifications",
    title: "Certifications",
    hasContent: (s) => (s?.certifications?.length ?? 0) > 0,
    render: (s) => <BulletList items={s?.certifications} />,
  },
];

function SummaryAccordion({
  summary,
  isStreaming,
}: {
  summary: SummaryShape | null;
  isStreaming: boolean;
}) {
  if (summary == null && !isStreaming) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Resume summary
      </span>
      <Accordion type="multiple" className="bg-card">
        {SUMMARY_SECTIONS.map((section) => (
          <AccordionItem key={section.id} value={section.id}>
            <AccordionTrigger>
              <SectionTriggerLabel
                title={section.title}
                ready={section.hasContent(summary)}
                isStreaming={isStreaming}
              />
            </AccordionTrigger>
            <AccordionContent>{section.render(summary)}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function SectionTriggerLabel({
  title,
  ready,
  isStreaming,
}: {
  title: string;
  ready: boolean;
  isStreaming: boolean;
}) {
  return (
    <span className="flex w-full items-center gap-2">
      <span className="font-medium">{title}</span>
      {!ready && isStreaming && (
        <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
      )}
    </span>
  );
}

function Paragraph({ value }: { value: string | undefined }) {
  if (!value || value.length === 0) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
      {value}
    </p>
  );
}

function BulletList({ items }: { items: ReadonlyArray<string | undefined> | undefined }) {
  if (items == null || items.length === 0) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <li key={index}>{item ?? ""}</li>
      ))}
    </ul>
  );
}

function TagList({ items }: { items: ReadonlyArray<string | undefined> | undefined }) {
  if (items == null || items.length === 0) {
    return (
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-24" />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <span
          key={index}
          className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
        >
          {item ?? ""}
        </span>
      ))}
    </div>
  );
}
