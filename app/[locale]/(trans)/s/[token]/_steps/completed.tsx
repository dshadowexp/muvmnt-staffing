"use client";

import { CheckCircleIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ScreeningRow, ScreeningCandidateRow } from "@/features/screenings/dal/queries";

type Props = {
  screening: ScreeningRow;
  candidate: ScreeningCandidateRow;
};

export function CompletedStep({ screening, candidate }: Props) {
  const name = candidate.first_name ?? "there";

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircleIcon className="size-8 text-green-600" aria-hidden />
              </div>
            </div>
            <CardTitle className="text-2xl">All done, {name}!</CardTitle>
            <CardDescription className="text-base mt-1">
              Your screening for <strong>{screening.title}</strong> is complete.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              The employer will review your interview and be in touch if there&apos;s a match.
              You don&apos;t need to do anything else.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
