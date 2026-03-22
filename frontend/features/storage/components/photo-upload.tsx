"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
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
  onUploaded?: (file: { key?: string }) => void;
  onFileChange?: (hasFile: boolean) => void;
  error?: string;
  className?: string;
}

const IMAGE_ACCEPT = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_MB = 5;

// ─── Component ─────────────────────────────────────────────────────────────────

export function PhotoUpload({
  context,
  initialFileKey,
  onUploaded,
  onFileChange,
  error: externalError,
  className,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<UploadedPhoto | null>(null);
  const [error, setError] = useState("");
  const [removingExisting, setRemovingExisting] = useState(false);
  const [existingPreviewUrl, setExistingPreviewUrl] = useState<string | null>(null);

  const uploading = file?.uploading ?? false;
  const isDeleting = file?.isDeleting ?? false;
  const hasExisting = !!initialFileKey && !file;
  const done =
    !!(file && !file.uploading && !file.error && file.key) || hasExisting;
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
      }
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

    setFile((prev) =>
      prev?.id === fileId ? { ...prev, isDeleting: true } : prev
    );

    try {
      await deleteFile(file.key!);
      setFile(null);
      queueMicrotask(() => onFileChange?.(false));
      toast.success("Photo removed successfully");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Failed to remove photo from storage."
      );
      setFile((prev) =>
        prev?.id === fileId ? { ...prev, isDeleting: false, error: true } : prev
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
      const { url, key } = await getPresignedUrl({
        filename: f.name,
        contentType: f.type || "image/jpeg",
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
              }
              return prev;
            });
            toast.success("Photo uploaded successfully");
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
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`Photo must be under ${MAX_MB} MB`);
      e.target.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(f);
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
    e.target.value = "";
  }

  const isLoading = uploading || isDeleting || removingExisting;
  const canInteract = !isLoading;

  return (
    <Field
      data-invalid={!!displayError || hasError}
      className={cn("flex flex-col gap-2", className)}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() =>
          canInteract &&
          !file &&
          !hasExisting &&
          inputRef.current?.click()
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
          !file && !hasExisting && "cursor-pointer hover:border-primary/50 hover:bg-muted/50",
          done && "border-solid border-primary/25 bg-primary/5",
          hasError && "border-destructive/50"
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
                <Loader2 className="size-8 animate-spin text-primary" />
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
                      removeFile(file.id);
                    } else if (hasExisting) {
                      removeExistingFile();
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
              <Loader2 className="size-10 animate-spin text-muted-foreground" />
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

      {displayError && <FieldError>{displayError}</FieldError>}

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT.join(",")}
        className="sr-only"
        onChange={handleFileChange}
      />
    </Field>
  );
}
