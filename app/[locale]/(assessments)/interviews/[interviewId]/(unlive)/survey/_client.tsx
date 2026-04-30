"use client";

import { useState } from "react";
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
          <h1 className="text-xl font-semibold tracking-tight">Interview complete</h1>
          <p className="text-sm text-muted-foreground">
            Help us improve by sharing your experience.
          </p>
        </div>

        {/* Survey card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              How was your interview experience?
            </CardTitle>
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
                  aria-label={`Rate ${star} out of 5`}
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
              <p className="text-xs text-muted-foreground">
                Anything else you&apos;d like to share? (optional)
              </p>
              <Textarea
                placeholder="Share your thoughts…"
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
              "Submit feedback"
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push(redirectTo)}
            className="w-full text-muted-foreground"
            disabled={submitting}
          >
            Skip
          </Button>
        </div>

      </div>
    </div>
  );
}
