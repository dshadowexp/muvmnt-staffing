"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { StarRating } from "@/components/ui/star-rating";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { ShiftActionCard } from "@/features/shifts/components/shift-action-card";
import { rateClientShiftAction, tipClientShiftAction } from "@/features/shifts/actions";
import { formatCurrency } from "@/lib/formatters";

type Props = {
  shiftId: string;
  workerName: string;
  existingRating: { rating: number; comment: string | null } | null;
  existingTip: { amountCents: number; currency: string } | null;
};

const TIP_PRESETS_CENTS = [500, 1000, 2000, 5000] as const;
const TIP_MIN_CENTS = 100;
const TIP_MAX_CENTS = 100_000;

/**
 * Actions shown to the client after a shift is completed: rate the worker and/or
 * send a tip that routes directly to the worker's Stripe Connect account.
 */
export function ClientShiftReviewActions({
  shiftId,
  workerName,
  existingRating,
  existingTip,
}: Props) {
  const [rateOpen, setRateOpen] = React.useState(false);
  const [tipOpen, setTipOpen] = React.useState(false);

  const hasRated = existingRating != null;
  const hasTipped = existingTip != null;

  const ratingDescription = hasRated
    ? `You rated ${existingRating!.rating}/5${
        existingRating!.comment ? ` — “${existingRating!.comment}”` : ""
      }. Tap to update.`
    : `Share how ${workerName} did. Your rating helps surface the best workers for future shifts.`;

  const tipDescription = hasTipped
    ? `You tipped ${formatCurrency(
        existingTip!.amountCents / 100,
        existingTip!.currency,
      )}. Funds are on their way to ${workerName}.`
    : `Send an optional tip straight to ${workerName}'s payout account. No platform fee.`;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ShiftActionCard
          title={hasRated ? "Update rating" : "Rate worker"}
          description={ratingDescription}
          onClick={() => setRateOpen(true)}
        />
        <ShiftActionCard
          title={hasTipped ? "Tip sent" : "Tip worker"}
          description={tipDescription}
          onClick={() => setTipOpen(true)}
          disabled={hasTipped}
        />
      </div>

      <RateWorkerDialog
        open={rateOpen}
        onOpenChange={setRateOpen}
        shiftId={shiftId}
        workerName={workerName}
        initialRating={existingRating?.rating ?? 0}
        initialComment={existingRating?.comment ?? ""}
      />

      <TipWorkerDialog
        open={tipOpen}
        onOpenChange={setTipOpen}
        shiftId={shiftId}
        workerName={workerName}
        disabled={hasTipped}
      />
    </>
  );
}

function RateWorkerDialog({
  open,
  onOpenChange,
  shiftId,
  workerName,
  initialRating,
  initialComment,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shiftId: string;
  workerName: string;
  initialRating: number;
  initialComment: string;
}) {
  const router = useRouter();
  const [rating, setRating] = React.useState(initialRating);
  const [comment, setComment] = React.useState(initialComment);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (open) {
      setRating(initialRating);
      setComment(initialComment);
    }
  }, [open, initialRating, initialComment]);

  const submit = () => {
    if (rating < 1 || rating > 5) {
      toast.error("Select 1 to 5 stars");
      return;
    }
    startTransition(async () => {
      const trimmed = comment.trim();
      const res = await rateClientShiftAction(shiftId, {
        rating,
        comment: trimmed.length ? trimmed : undefined,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Rating saved");
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate {workerName}</DialogTitle>
          <DialogDescription>
            Let us know how this shift went. Your rating helps surface the best workers for future shifts.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 py-2">
            <StarRating value={rating} onChange={setRating} disabled={pending} />
            <p className="text-muted-foreground text-xs">
              {rating > 0 ? `${rating} of 5 stars` : "Tap a star to rate"}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rating-comment">Comment (optional)</Label>
            <Textarea
              id="rating-comment"
              placeholder="Share what went well, or what could improve."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={pending}
              rows={4}
              maxLength={1000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending || rating < 1}>
            <LoadingSwap isLoading={pending}>
              <span>Submit rating</span>
            </LoadingSwap>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TipWorkerDialog({
  open,
  onOpenChange,
  shiftId,
  workerName,
  disabled,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shiftId: string;
  workerName: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [preset, setPreset] = React.useState<number | "custom">(TIP_PRESETS_CENTS[1]);
  const [customDollars, setCustomDollars] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (open) {
      setPreset(TIP_PRESETS_CENTS[1]);
      setCustomDollars("");
    }
  }, [open]);

  const resolvedCents = React.useMemo(() => {
    if (preset === "custom") {
      const value = Number.parseFloat(customDollars);
      if (!Number.isFinite(value) || value <= 0) return 0;
      return Math.round(value * 100);
    }
    return preset;
  }, [preset, customDollars]);

  const validCents =
    resolvedCents >= TIP_MIN_CENTS && resolvedCents <= TIP_MAX_CENTS
      ? resolvedCents
      : 0;

  const submit = () => {
    if (!validCents) {
      toast.error(
        `Tip must be between ${formatCurrency(TIP_MIN_CENTS / 100, "CAD", 2)} and ${formatCurrency(
          TIP_MAX_CENTS / 100,
          "CAD",
          0,
        )}`,
      );
      return;
    }
    startTransition(async () => {
      const res = await tipClientShiftAction(shiftId, { amountCents: validCents });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Tip of ${formatCurrency((res.amountCents ?? validCents) / 100, res.currency ?? "CAD")} sent`,
      );
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tip staff</DialogTitle>
          <DialogDescription>
            The full tip straight to{" "}
            {workerName}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TIP_PRESETS_CENTS.map((cents) => {
              const active = preset === cents;
              return (
                <Button
                  key={cents}
                  type="button"
                  variant={active ? "default" : "outline"}
                  disabled={pending || disabled}
                  onClick={() => setPreset(cents)}
                >
                  {formatCurrency(cents / 100, "CAD", 0)}
                </Button>
              );
            })}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tip-custom">Custom amount (CAD)</Label>
            <Input
              id="tip-custom"
              inputMode="decimal"
              placeholder="e.g. 15.00"
              value={customDollars}
              onChange={(e) => {
                setCustomDollars(e.target.value);
                setPreset("custom");
              }}
              onFocus={() => setPreset("custom")}
              disabled={pending || disabled}
            />
          </div>

          <div className="bg-muted/40 text-muted-foreground flex items-center justify-between rounded-md border p-3 text-sm">
            <span>Total charged</span>
            <span className="text-foreground font-medium">
              {validCents ? formatCurrency(validCents / 100, "CAD") : "—"}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending || disabled || !validCents}>
            <LoadingSwap isLoading={pending}>
              <span>Send tip</span>
            </LoadingSwap>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
