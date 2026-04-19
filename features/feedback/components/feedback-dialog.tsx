"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  BugIcon,
  StarIcon,
  LightbulbIcon,
  ImagePlusIcon,
  Loader2,
  XIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { submitFeedbackAction } from "@/features/feedback/actions";
import { getPresignedUrl } from "@/features/storage/dal/queries";

const CATEGORY_VALUES = [
  { value: "rating" as const, icon: StarIcon },
  { value: "bug" as const, icon: BugIcon },
  { value: "feature" as const, icon: LightbulbIcon },
];

type Category = (typeof CATEGORY_VALUES)[number]["value"];

const MAX_MB = 5;
const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp";

export function FeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("feedback.dialog");
  const tErrors = useTranslations("feedback.errors");
  const [category, setCategory] = useState<Category>("rating");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [screenshotKey, setScreenshotKey] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setCategory("rating");
    setMessage("");
    setRating(0);
    setHoverRating(0);
    setScreenshotKey(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploading(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(t("imageTooLarge", { maxMb: MAX_MB }));
      return;
    }

    setUploading(true);
    try {
      const { url, key } = await getPresignedUrl({
        filename: file.name,
        contentType: file.type || "image/jpeg",
        context: "feedback",
      });
      await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      setScreenshotKey(key);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    } catch {
      toast.error(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  function removeScreenshot() {
    setScreenshotKey(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  useEffect(() => {
    if (category !== "rating") return;
    if (screenshotKey || previewUrl) {
      setScreenshotKey(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [category, previewUrl, screenshotKey]);

  function handleSubmit() {
    if (!message.trim()) {
      toast.error(t("messageRequired"));
      return;
    }
    startTransition(async () => {
      const res = await submitFeedbackAction({
        category,
        message,
        rating: category === "rating" ? rating : null,
        screenshotKey,
      });
      if (!res.ok) {
        if (res.code === "submitFailed" && res.message) {
          toast.error(res.message);
        } else {
          toast.error(tErrors(res.code));
        }
      } else {
        toast.success(t("thankYou"));
        handleOpenChange(false);
      }
    });
  }

  const activeStars = hoverRating || rating;
  const isSubmitting = pending || uploading;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {CATEGORY_VALUES.map(({ value, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors",
                  category === value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {t(`categories.${value}`)}
              </button>
            ))}
          </div>

          <Textarea
            placeholder={
              category === "bug"
                ? t("placeholderBug")
                : category === "feature"
                  ? t("placeholderFeature")
                  : t("placeholderRating")
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="resize-none"
          />

          {category !== "rating" ? (
            previewUrl ? (
              <div className="relative w-fit">
                <img
                  src={previewUrl}
                  alt={t("screenshotAlt")}
                  className="h-20 w-auto rounded-lg border object-cover"
                />
                <button
                  type="button"
                  onClick={removeScreenshot}
                  className="absolute -right-1.5 -top-1.5 rounded-full border bg-background p-0.5 shadow-sm hover:bg-muted"
                >
                  <XIcon className="size-3" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit gap-1.5"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ImagePlusIcon className="size-3.5" />
                )}
                {uploading ? t("uploading") : t("attachScreenshot")}
              </Button>
            )
          ) : (
            <div className="flex items-center justify-start gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  <StarIcon
                    className={cn(
                      "size-7 transition-colors",
                      star <= activeStars
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30",
                    )}
                  />
                </button>
              ))}
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="sr-only"
            onChange={handleFileChange}
          />
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !message.trim()}
            className="w-full sm:w-auto"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("sending")}
              </>
            ) : (
              t("submit")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
