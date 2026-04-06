"use client";

import { useState, useTransition } from "react";
import { acceptStaffRequestHourlyRateAction } from "@/features/jobs/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { toast } from "sonner";

const MIN_RATE = 15;

export function PricingAcceptForm({
  jobId,
  suggestedHourlyRate,
}: {
  jobId: string;
  suggestedHourlyRate: number | null;
}) {
  const [rate, setRate] = useState(
    suggestedHourlyRate != null && suggestedHourlyRate >= MIN_RATE
      ? String(suggestedHourlyRate)
      : "",
  );
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(rate);
    startTransition(async () => {
      const res = await acceptStaffRequestHourlyRateAction(jobId, n);
      if (res && "error" in res && res.error) {
        toast.error(res.message ?? "Could not save rate");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border-t border-border pt-4">
      <Field>
        <FieldLabel htmlFor="confirm-hourly-rate">Confirm hourly rate ($)</FieldLabel>
        <FieldDescription>
          This is saved to your staff request after you accept. Minimum ${MIN_RATE}/hr.
        </FieldDescription>
        <Input
          id="confirm-hourly-rate"
          type="number"
          step="0.01"
          min={MIN_RATE}
          placeholder="e.g. 35"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          required
        />
      </Field>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        <LoadingSwap isLoading={pending}>
          <span>Accept rate and continue</span>
        </LoadingSwap>
      </Button>
    </form>
  );
}
