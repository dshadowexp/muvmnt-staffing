"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, CircleDashedIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getPresignedUrl,
  getPresignedDownloadUrl,
} from "@/features/storage/dal/queries";
import { deleteFile } from "@/features/storage/dal/mutations";
import { Field, FieldError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { StorageFolder } from "@/services/s3/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadedPhoto {
  id: string;
  file: File;
  uploading: boolean;
  progress: number;
  key?: string;
  isDeleting: boolean;
  error: boolean;
  objectUrl?: string;
}

interface PhotoUploadProps {
  context: StorageFolder;
  initialFileKey?: string;
  deferredUpload?: boolean;
  onPendingFileChange?: (file: File | null) => void;
  deferredPendingHint?: string;
  onUploaded?: (file: { key?: string }) => void;
  onFileChange?: (hasFile: boolean) => void;
  error?: string;
  className?: string;
  /** When true, blocks choosing/removing a photo (e.g. form submit or auth loading). */
  disabled?: boolean;
}

// iOS commonly produces HEIC/HEIF photos; include them so users can select a
// recent camera roll photo before interviews.
const IMAGE_ACCEPT = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];
const MAX_MB = 5;

function inferContentType(file: File): string {
  if (file.type) return file.type;

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (ext === "heic") return "image/heic";
  if (ext === "heif") return "image/heif";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function PhotoUpload({
  context,
  initialFileKey,
  deferredUpload = false,
  onPendingFileChange,
  deferredPendingHint,
  onUploaded,
  onFileChange,
  error: externalError,
  className,
  disabled = false,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<UploadedPhoto | null>(null);
  const [error, setError] = useState("");
  const [removingExisting, setRemovingExisting] = useState(false);
  const [existingPreviewUrl, setExistingPreviewUrl] = useState<string | null>(null);

  const uploading = file?.uploading ?? false;
  const isDeleting = file?.isDeleting ?? false;
  const hasExisting = !!initialFileKey && !file;
  const hasLocalDeferred =
    deferredUpload && !!file && !file.key && !file.uploading && !file.error;
  const done =
    !!(file && !file.uploading && !file.error && (file.key || deferredUpload)) ||
    hasExisting;
  const hasError = file?.error ?? false;
  const displayError = externalError ?? error;

  const previewUrl = file?.objectUrl ?? existingPreviewUrl;

  useEffect(() => {
    if (!initialFileKey || file) return;

    let cancelled = false;
    getPresignedDownloadUrl(initialFileKey).then(
      (res) => {
        if (!cancelled) setExistingPreviewUrl(res.url);
      },
      () => {
        if (!cancelled) setExistingPreviewUrl(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [initialFileKey, !!file]);

  const objectUrlRef = useRef<string | null>(null);
  useEffect(() => {
    objectUrlRef.current = file?.objectUrl ?? null;
  }, [file?.objectUrl]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      setExistingPreviewUrl(null);
    };
  }, []);

  async function removeFile(fileId: string) {
    if (!file) return;
    if (file.objectUrl) URL.revokeObjectURL(file.objectUrl);

    if (deferredUpload && !file.key) {
      setFile(null);
      queueMicrotask(() => onPendingFileChange?.(null));
      return;
    }

    setFile((prev) =>
      prev?.id === fileId ? { ...prev, isDeleting: true } : prev,
    );

    try {
      await deleteFile(file.key!);
      setFile(null);
      queueMicrotask(() => onFileChange?.(false));
      toast.success("Photo removed successfully");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Failed to remove photo from storage.",
      );
      setFile((prev) =>
        prev?.id === fileId ? { ...prev, isDeleting: false, error: true } : prev,
      );
    }
  }

  async function removeExistingFile() {
    if (!initialFileKey) return;
    setRemovingExisting(true);
    setExistingPreviewUrl(null);
    try {
      await deleteFile(initialFileKey);
      queueMicrotask(() => onFileChange?.(false));
      toast.success("Photo removed successfully");
    } catch {
      toast.error("Failed to remove photo from storage.");
    } finally {
      setRemovingExisting(false);
    }
  }

  async function uploadFile(f: File) {
    try {
      const contentType = inferContentType(f);
      const { url, key } = await getPresignedUrl({
        filename: f.name,
        contentType,
        context,
      });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setFile((prev) =>
              prev?.file === f ? { ...prev, progress: percent, key } : prev,
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 204) {
            setFile((prev) => {
              if (prev?.file !== f) return prev;
              return {
                ...prev,
                progress: 100,
                uploading: false,
                error: false,
                key,
              };
            });
            queueMicrotask(() => {
              onFileChange?.(true);
              onUploaded?.({ key });
            });
            resolve();
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("PUT", url);
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.send(f);
      });
    } catch {
      toast.error("Failed to upload photo");
      setFile((prev) => {
        if (prev?.file === f && prev.objectUrl) {
          URL.revokeObjectURL(prev.objectUrl);
        }
        return prev?.file === f
          ? { ...prev, uploading: false, progress: 0, error: true, objectUrl: undefined }
          : prev;
      });
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (disabled) return;
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`Photo must be under ${MAX_MB} MB`);
      e.target.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(f);

    if (deferredUpload) {
      const newFile: UploadedPhoto = {
        id: crypto.randomUUID(),
        file: f,
        uploading: false,
        progress: 0,
        isDeleting: false,
        error: false,
        objectUrl,
      };
      setFile(newFile);
      queueMicrotask(() => onPendingFileChange?.(f));
    } else {
      const newFile: UploadedPhoto = {
        id: crypto.randomUUID(),
        file: f,
        uploading: true,
        progress: 0,
        isDeleting: false,
        error: false,
        objectUrl,
      };
      setFile(newFile);
      uploadFile(f);
    }
    e.target.value = "";
  }

  const isLoading = uploading || isDeleting || removingExisting;
  const canInteract = !isLoading && !disabled;

  return (
    <Field
      data-invalid={!!displayError || hasError}
      className={cn("flex flex-col gap-2", className)}
    >
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() =>
          canInteract && !file && !hasExisting && inputRef.current?.click()
        }
        onKeyDown={(e) =>
          canInteract &&
          !file &&
          !hasExisting &&
          (e.key === "Enter" || e.key === " ") &&
          inputRef.current?.click()
        }
        className={cn(
          "relative flex aspect-square w-full max-w-[200px] flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors",
          "border-input bg-muted/30",
          !file && !hasExisting && canInteract && "cursor-pointer hover:border-primary/50 hover:bg-muted/50",
          done && "border-solid border-primary/25 bg-primary/5",
          hasError && "border-destructive/50",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt="Uploaded photo"
              className="absolute inset-0 h-full w-full object-cover"
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <CircleDashedIcon className="size-8 animate-spin text-primary" />
              </div>
            )}
            {done && canInteract && (
              <div className="absolute right-2 top-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  className="h-8 w-8 rounded-full shadow-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (file && !file.uploading && !file.isDeleting) {
                      void removeFile(file.id);
                    } else if (hasExisting) {
                      void removeExistingFile();
                    }
                  }}
                  title="Remove photo"
                  aria-label="Remove photo"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            {isLoading ? (
              <CircleDashedIcon className="size-10 animate-spin text-muted-foreground" />
            ) : (
              <Camera className="size-10 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground">
              {isLoading
                ? uploading
                  ? `Uploading… ${file?.progress ?? 0}%`
                  : "Removing…"
                : "Upload photo"}
            </span>
            <span className="text-xs text-muted-foreground/80">
              {IMAGE_ACCEPT.join(", ")} · max {MAX_MB} MB
            </span>
          </div>
        )}
      </div>

      {hasLocalDeferred && deferredPendingHint ? (
        <p className="text-muted-foreground text-xs leading-snug">{deferredPendingHint}</p>
      ) : null}

      {displayError && <FieldError>{displayError}</FieldError>}

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT.join(",")}
        className="sr-only"
        disabled={disabled}
        onChange={handleFileChange}
      />
    </Field>
  );
}
