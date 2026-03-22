"use client";

import { useState, useRef } from "react";
import { Check, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getPresignedUrl } from "@/features/storage/dal/queries";
import { deleteFile } from "@/features/storage/dal/mutations";
import {
  Field,
  FieldError,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { StorageFolder } from "@/services/s3/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadedFile {
  id: string;
  file: File;
  uploading: boolean;
  progress: number;
  key?: string;
  isDeleting: boolean;
  error: boolean;
  objectUrl?: string;
}

interface FileInputProps {
  context: StorageFolder;
  accept?: string[];
  maxMb?: number;
  required?: boolean;
  initialFileKey?: string;
  onUploaded?: (file: UploadedFile) => void;
  onFileChange?: (hasFile: boolean) => void;
  error?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Extract display filename from S3 key: {folder}/{ownerId}/{timestamp}-{filename} */
function getFilenameFromKey(key: string): string {
  const lastPart = key.split("/").pop() ?? key;
  const match = lastPart.match(/^\d+-(.+)$/);
  return match ? match[1] : lastPart;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function FileInput({
  context,
  accept = [".pdf"],
  maxMb = 10,
  required,
  initialFileKey,
  onUploaded,
  onFileChange,
  error: externalError,
}: FileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [error, setError] = useState("");
  const [removingExisting, setRemovingExisting] = useState(false);

  const uploading = file?.uploading ?? false;
  const isDeleting = file?.isDeleting ?? false;
  const hasExisting = !!initialFileKey && !file;
  const done = !!(file && !file.uploading && !file.error && file.key) || hasExisting;
  const hasError = file?.error ?? false;
  const displayError = externalError ?? error;

  async function removeFile(fileId: string) {
    if (!file) return;
    if (file.objectUrl) URL.revokeObjectURL(file.objectUrl);

    setFile((prev) =>
      prev?.id === fileId ? { ...prev, isDeleting: true } : prev
    );

    try {
      await deleteFile(file.key!);
      setFile(null);
      queueMicrotask(() => onFileChange?.(false));
      toast.success("File removed successfully");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to remove file from storage.");
      setFile((prev) =>
        prev?.id === fileId ? { ...prev, isDeleting: false, error: true } : prev
      ); 
    }
  }

  async function removeExistingFile() {
    if (!initialFileKey) return;
    setRemovingExisting(true);
    try {
      await deleteFile(initialFileKey);
      queueMicrotask(() => onFileChange?.(false));
      toast.success("File removed successfully");
    } catch {
      toast.error("Failed to remove file from storage.");
    } finally {
      setRemovingExisting(false);
    }
  }

  async function uploadFile(f: File) {
    try {
      const { url, key } = await getPresignedUrl({
        filename: f.name,
        contentType: f.type || "application/octet-stream",
        context,
      });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setFile((prev) =>
              prev?.file === f ? { ...prev, progress: percent, key } : prev
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 204) {
            setFile((prev) => {
              if (prev?.file === f) {
                const completed = { ...prev, progress: 100, uploading: false, error: false, key };
                queueMicrotask(() => {
                  onFileChange?.(true);
                  onUploaded?.(completed);
                });
                return completed;
              }
              return prev;
            });
            toast.success("File uploaded successfully");
            resolve();
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("PUT", url);
        xhr.setRequestHeader("Content-Type", f.type);
        xhr.send(f);
      });
    } catch {
      toast.error("Failed to get presigned URL");
      setFile((prev) =>
        prev?.file === f ? { ...prev, uploading: false, progress: 0, error: true } : prev
      );
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const newFile: UploadedFile = {
      id: crypto.randomUUID(),
      file: f,
      uploading: true,
      progress: 0,
      isDeleting: false,
      error: false,
    };
    setFile(newFile);
    uploadFile(f);
    e.target.value = "";
  }

  return (
    <Field data-invalid={!!displayError || hasError} className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => !file && !hasExisting && inputRef.current?.click()}
        onKeyDown={(e) =>
          !file &&
          !hasExisting &&
          (e.key === "Enter" || e.key === " ") &&
          inputRef.current?.click()
        }
        className={cn(
          "flex min-h-10 items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors",
          "border-input bg-input/30",
          !file && !hasExisting && "cursor-pointer hover:border-primary/50",
          done && "border-primary/25 bg-primary/5",
          hasError && "border-destructive/50"
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {(uploading || isDeleting || removingExisting) && (
            <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
          )}
          <span
            className={cn(
              "truncate text-sm",
              file || hasExisting ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {isDeleting || removingExisting
              ? "Removing…"
              : file
                ? `${file.file.name} · ${formatBytes(file.file.size)}`
                : hasExisting && initialFileKey
                  ? getFilenameFromKey(initialFileKey)
                  : `Select file — ${accept.join(", ")} · up to ${maxMb} MB`}
          </span>
          {done && !removingExisting && (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
              <Check className="size-3.5" strokeWidth={2.5} />
              Uploaded
            </span>
          )}
        </div>

        {uploading && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {file?.progress}%
          </span>
        )}

        <div className="flex shrink-0 items-center gap-0.5">
          {file && !uploading && !isDeleting && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                removeFile(file.id);
              }}
              title="Remove file"
              aria-label="Remove file"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
          {hasExisting && !removingExisting && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                removeExistingFile();
              }}
              title="Remove file"
              aria-label="Remove file"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
          {!file && !hasExisting && (
            <Upload className="size-4 shrink-0 text-muted-foreground pointer-events-none" />
          )}
        </div>
      </div>

      {uploading && (
        <div className="h-0.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-100 ease-linear"
            style={{ width: `${file?.progress ?? 0}%` }}
          />
        </div>
      )}

      {displayError && <FieldError>{displayError}</FieldError>}

      <input
        ref={inputRef}
        type="file"
        accept={accept.join(",")}
        className="sr-only"
        onChange={handleFileChange}
      />
    </Field>
  );
}
