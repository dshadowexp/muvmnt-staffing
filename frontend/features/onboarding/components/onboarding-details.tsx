"use client";

import { useOnboarding } from "../onboarding-provider";

export function OnboardingDetails() {
    const { step } = useOnboarding();

    if (!step) return null;

    return (
        <div className="space-y-2" key={step.id}>
            <h1 className="text-2xl font-semibold tracking-tight">
                {step.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
                {step.description}
            </p>
        </div>
    );
}