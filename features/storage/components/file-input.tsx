"use client";

import { useRef, useState } from "react";
import { Check, CircleDashedIcon, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getPresignedUrl } from "@/features/storage/dal/queries";
import { deleteFile } from "@/features/storage/dal/mutations";
import { Field, FieldError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { StorageFolder } from "@/services/s3/api";

interface UploadedFile {
  id: string;
  file: File;
  uploading: boolean;
  progress: number;
  key?: string;
  isDeleting: boolean;
  error: boolean;
}

interface FileInputProps {
  context: StorageFolder;
  accept?: string[];
  maxMb?: number;
  required?: boolean;
  initialFileKey?: string;
  /** Default true: upload immediately after file selection. */
  uploadToCloud?: boolean;
  onUploaded?: (file: UploadedFile) => void;
  /** Called when a local file is selected/cleared in deferred mode. */
  onSelectedFile?: (file: File | null) => void;
  /** Called after a stored file (`initialFileKey`) is removed from cloud storage. */
  onExistingRemoved?: () => void;
  onFileChange?: (hasFile: boolean) => void;
  error?: string;
  disabled?: boolean;
}

/** Extract display filename from S3 key: {folder}/{ownerId}/{timestamp}-{filename}. */
export function getFilenameFromKey(key: string): string {
  const lastPart = key.split("/").pop() ?? key;
  const match = lastPart.match(/^\d+-(.+)$/);
  return match ? match[1] : lastPart;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type UploadToStorageParams = {
  file: File;
  context: StorageFolder;
  onProgress?: (percent: number, key: string) => void;
};

/**
 * Upload a file to S3 via presigned URL and return object key.
 * Shared by immediate-upload mode and deferred-upload flows.
 */
export async function uploadFileToStorage({
  file,
  context,
  onProgress,
}: UploadToStorageParams): Promise<{ key: string }> {
  const { url, key } = await getPresignedUrl({
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    context,
  });

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      onProgress?.(percent, key);
    };

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 204) resolve();
      else reject(new Error(`Upload failed with status: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });

  return { key };
}

export function FileInput({
  context,
  accept = [".pdf"],
  maxMb = 10,
  required,
  initialFileKey,
  uploadToCloud = true,
  onUploaded,
  onSelectedFile,
  onExistingRemoved,
  onFileChange,
  error: externalError,
  disabled = false,
}: FileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [error] = useState("");
  const [removingExisting, setRemovingExisting] = useState(false);

  const uploading = file?.uploading ?? false;
  const isDeleting = file?.isDeleting ?? false;
  const hasExisting = !!initialFileKey && !file;
  const done =
    !!(file && !file.uploading && !file.error && (file.key || !uploadToCloud)) ||
    hasExisting;
  const hasError = file?.error ?? false;
  const displayError = externalError ?? error;

  async function removeSelectedFile(fileId: string) {
    if (disabled || !file) return;
    setFile((prev) =>
      prev?.id === fileId ? { ...prev, isDeleting: true } : prev,
    );

    // Deferred mode: local file only, nothing to delete remotely.
    if (!uploadToCloud || !file.key) {
      setFile(null);
      queueMicrotask(() => {
        onSelectedFile?.(null);
        onFileChange?.(false);
      });
      return;
    }

    try {
      await deleteFile(file.key);
      setFile(null);
      queueMicrotask(() => {
        onSelectedFile?.(null);
        onFileChange?.(false);
      });
      toast.success("File removed successfully");
    } catch (uploadError) {
      console.error(uploadError);
      toast.error(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to remove file from storage.",
      );
      setFile((prev) =>
        prev?.id === fileId ? { ...prev, isDeleting: false, error: true } : prev,
      );
    }
  }

  async function removeExistingFile() {
    if (disabled || !initialFileKey) return;
    setRemovingExisting(true);
    try {
      await deleteFile(initialFileKey);
      queueMicrotask(() => {
        onExistingRemoved?.();
        onFileChange?.(false);
      });
      toast.success("File removed successfully");
    } catch {
      toast.error("Failed to remove file from storage.");
    } finally {
      setRemovingExisting(false);
    }
  }

  async function uploadFileNow(f: File) {
    try {
      const { key } = await uploadFileToStorage({
        file: f,
        context,
        onProgress: (percent, progressKey) => {
          setFile((prev) =>
            prev?.file === f
              ? { ...prev, progress: percent, key: progressKey }
              : prev,
          );
        },
      });

      setFile((prev) => {
        if (prev?.file !== f) return prev;
        const completed = {
          ...prev,
          progress: 100,
          uploading: false,
          error: false,
          key,
        };
        queueMicrotask(() => {
          onFileChange?.(true);
          onUploaded?.(completed);
        });
        return completed;
      });

      if (!onUploaded) {
        toast.success("File uploaded successfully");
      }
    } catch {
      toast.error("Failed to get presigned URL");
      setFile((prev) =>
        prev?.file === f
          ? { ...prev, uploading: false, progress: 0, error: true }
          : prev,
      );
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (disabled) return;
    const selected = e.target.files?.[0];
    if (!selected) return;

    const deferred = !uploadToCloud;
    const nextFile: UploadedFile = {
      id: crypto.randomUUID(),
      file: selected,
      uploading: !deferred,
      progress: deferred ? 100 : 0,
      isDeleting: false,
      error: false,
    };
    setFile(nextFile);

    if (deferred) {
      queueMicrotask(() => {
        onSelectedFile?.(selected);
        onFileChange?.(true);
      });
    } else {
      uploadFileNow(selected);
    }

    e.target.value = "";
  }

  return (
    <Field data-invalid={!!displayError || hasError} className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() =>
          !disabled &&
          !file &&
          !hasExisting &&
          inputRef.current?.click()
        }
        onKeyDown={(e) =>
          !disabled &&
          !file &&
          !hasExisting &&
          (e.key === "Enter" || e.key === " ") &&
          inputRef.current?.click()
        }
        className={cn(
          "flex min-h-10 items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors",
          "border-input bg-input/30",
          !file &&
            !hasExisting &&
            !disabled &&
            "cursor-pointer hover:border-primary/50",
          done && "border-primary/25 bg-primary/5",
          hasError && "border-destructive/50",
          disabled && "pointer-events-none cursor-not-allowed opacity-60",
        )}
        aria-disabled={disabled}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {(uploading || isDeleting || removingExisting) && (
            <CircleDashedIcon className="size-4 shrink-0 animate-spin text-primary" />
          )}
          <span
            className={cn(
              "truncate text-sm",
              file || hasExisting ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {isDeleting || removingExisting
              ? "Removing..."
              : file
                ? `${file.file.name} · ${formatBytes(file.file.size)}`
                : hasExisting && initialFileKey
                  ? getFilenameFromKey(initialFileKey)
                  : `Select file — ${accept.join(", ")} · up to ${maxMb} MB`}
          </span>
          {done && !removingExisting && (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
              <Check className="size-3.5" strokeWidth={2.5} />
              {uploadToCloud ? "Uploaded" : "Selected"}
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
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                removeSelectedFile(file.id);
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
              disabled={disabled}
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
            <Upload className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
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

      {required && !done && (
        <FieldError>File is required.</FieldError>
      )}
      {displayError && <FieldError>{displayError}</FieldError>}

      <input
        ref={inputRef}
        type="file"
        accept={accept.join(",")}
        className="sr-only"
        disabled={disabled}
        onChange={handleFileChange}
      />
    </Field>
  );
}
