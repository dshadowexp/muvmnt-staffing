"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useOnboarding } from "../onboarding-provider";
import { Check } from "lucide-react";

function useStepTitleLookup() {
  const t = useTranslations("kyc.onboarding.steps");
  return (stepId: string, fallback: string) => {
    try {
      return t(`${stepId}.title`);
    } catch {
      return fallback;
    }
  };
}

// ─── Desktop: vertical progress with number + title horizontally ──────────────

function VerticalProgress() {
  const { steps, currentStepIndex, stepCompletion } = useOnboarding();
  const titleFor = useStepTitleLookup();

  if (steps.length === 0) return null;

  return (
    <div className="hidden md:flex flex-col min-w-[200px] shrink-0 pt-1">
      {steps.map((step, i) => {
        const isActive = i === currentStepIndex;
        const isComplete = stepCompletion[step.id]?.completed === true;
        const isLast = i === steps.length - 1;

        const Icon = step.icon;
        return (
          <div key={step.id} className="flex flex-col">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isComplete && "border-primary bg-primary text-primary-foreground",
                  isActive && "border-primary bg-primary text-primary-foreground",
                  !isComplete && !isActive && "border-muted-foreground/30 bg-background"
                )}
              >
                {isComplete ? (
                  <Check className="size-3" strokeWidth={2.5} />
                ) : (
                  <Icon className="size-3" />
                )}
              </div>
              <span
                className={cn(
                  "text-sm font-medium leading-snug",
                  (isActive || isComplete) ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {titleFor(step.id, step.title)}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "ml-2.5 mt-1 mb-1 w-px flex-1 min-h-[16px]",
                  isComplete ? "bg-primary" : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Mobile: "Onboarding" with dashes on top ───────────────────────────────────

function MobileDashes() {
  const { steps, currentStepIndex, step, stepCompletion } = useOnboarding();
  const titleFor = useStepTitleLookup();
  const tKyc = useTranslations("kyc.onboarding");

  if (steps.length === 0) return null;

  return (
    <div className="md:hidden space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        {step ? titleFor(step.id, step.title) : tKyc("progressFallback")}
      </p>
      <div className="flex gap-1.5">
        {steps.map((s, i) => {
          const isActive = i === currentStepIndex;
          const isComplete = stepCompletion[s.id]?.completed === true;
          return (
            <div
              key={i}
              className={cn(
                "h-1 w-6 shrink-0 rounded-full transition-colors",
                isComplete && "bg-primary",
                isActive && "bg-primary",
                !isComplete && !isActive && "bg-muted-foreground/20"
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Combined ─────────────────────────────────────────────────────────────────
// Single wrapper: mobile = full-width dashes above card; desktop = narrow vertical left of card

export function OnboardingProgress() {
  return (
    <div className="flex w-full flex-col md:w-auto md:min-w-[200px] md:max-w-[220px] md:shrink-0">
      <MobileDashes />
      <VerticalProgress />
    </div>
  );
}
