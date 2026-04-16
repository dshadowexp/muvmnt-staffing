"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Onboarding error:", error);
  }, [error]);

  return (
    <div className="flex items-start gap-3 rounded-[14px] border-[1.5px] border-destructive/20 bg-destructive/5 px-5 py-4">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
      <div>
        <h2 className="mb-1 font-[var(--font-display)] font-bold text-destructive">
          Oops! Something went wrong.
        </h2>
        <p className="text-[0.845rem] leading-snug text-destructive/80">
          {error.message}
        </p>
      </div>
    </div>
  );
}
