"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { CircleDashedIcon, CheckCircle2Icon, StarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { saveInterviewSurveyAction } from "@/features/interviews/actions";

type Props = {
  interviewId: string;
  redirectTo: string;
};

export function SurveyClient({ interviewId, redirectTo }: Props) {
  const router = useRouter();
  const t = useTranslations("assessments.interview.survey");
  const [rating, setRating] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const displayRating = hovered ?? rating ?? 0;

  async function handleSubmit() {
    if (!rating || submitting) return;
    setSubmitting(true);
    await saveInterviewSurveyAction(interviewId, {
      rating,
      ...(comment.trim() ? { comment: comment.trim() } : {}),
    });
    router.push(redirectTo);
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">

        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2Icon className="size-5 text-primary" />
            </div>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        {/* Survey card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("cardTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Star rating */}
            <div
              className="flex justify-center gap-1"
              onMouseLeave={() => setHovered(null)}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  className="rounded p-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={t("ariaRateStar", { star })}
                >
                  <StarIcon
                    className={cn(
                      "size-8 transition-colors",
                      star <= displayRating
                        ? "fill-primary text-primary"
                        : "fill-none text-muted-foreground/40"
                    )}
                  />
                </button>
              ))}
            </div>

            {/* Optional comment */}
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">{t("commentLabel")}</p>
              <Textarea
                placeholder={t("commentPlaceholder")}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="resize-none text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleSubmit}
            disabled={!rating || submitting}
            className="w-full"
          >
            {submitting ? (
              <CircleDashedIcon className="size-4 animate-spin" />
            ) : (
              t("submit")
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push(redirectTo)}
            className="w-full text-muted-foreground"
            disabled={submitting}
          >
            {t("skip")}
          </Button>
        </div>

      </div>
    </div>
  );
}
