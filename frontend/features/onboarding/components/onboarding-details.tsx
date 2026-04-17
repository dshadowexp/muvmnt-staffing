"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { useOnboarding } from "../onboarding-provider";

export function OnboardingDetails() {
  const { step } = useOnboarding();
  const t = useTranslations("kyc.onboarding.steps");

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

  const title = safeTranslate(t, `${step.id}.title`, step.title);
  const description = safeTranslate(t, `${step.id}.description`, step.description);

  return (
    <div className="space-y-2" key={step.id}>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

/**
 * Looks up a nested translation key and falls back to the provided default
 * when the key is missing (keeps the app working for new steps).
 */
function safeTranslate(
  t: ReturnType<typeof useTranslations>,
  key: string,
  fallback: string,
): string {
  try {
    return t(key);
  } catch {
    return fallback;
  }
}
