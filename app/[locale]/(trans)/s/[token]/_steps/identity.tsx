"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheckIcon, CircleDashedIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScreeningRow, ScreeningCandidateRow } from "@/features/screenings/dal/queries";
import { createCandidateIdentityVerificationAction } from "@/features/screenings/candidate-actions";

type Props = {
  screening: ScreeningRow;
  candidate: ScreeningCandidateRow;
  token: string;
  onVerified: () => void;
};

export function IdentityStep({ screening, candidate, token, onVerified }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleVerify() {
    setIsLoading(true);
    const returnUrl = `${window.location.origin}/s/${token}`;
    const result = await createCandidateIdentityVerificationAction(
      screening.id,
      returnUrl,
    );

    if (result.error) {
      toast.error(result.message);
      setIsLoading(false);
      return;
    }

    if (result.alreadyVerified) {
      onVerified();
      return;
    }

    if (result.url) {
      window.location.href = result.url;
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        <div className="text-center mb-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {screening.title}
          </p>
          <h1 className="text-2xl font-semibold mt-1">Verify your identity</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-muted p-2">
                <ShieldCheckIcon className="size-5 text-primary" aria-hidden />
              </div>
              <div>
                <CardTitle className="text-base">Identity verification required</CardTitle>
                <CardDescription className="text-sm mt-0.5">
                  This employer requires all candidates to verify their identity
                  before starting the interview.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground space-y-1.5">
              <p className="font-medium text-foreground">What you&apos;ll need</p>
              <ul className="list-disc list-inside space-y-1">
                <li>A valid government-issued photo ID (passport, driver&apos;s licence, or national ID)</li>
                <li>A device with a camera for a selfie</li>
                <li>2–3 minutes to complete the process</li>
              </ul>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleVerify}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <CircleDashedIcon className="size-4 animate-spin" />
                  Loading…
                </>
              ) : (
                "Verify my identity"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
