"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useOnboarding } from "../onboarding-provider";

export function OnboardingDetails() {
  const { step } = useOnboarding();

  if (!step) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2 pt-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2" key={step.id}>
      <h1 className="text-2xl font-semibold tracking-tight">{step.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
    </div>
  );
}