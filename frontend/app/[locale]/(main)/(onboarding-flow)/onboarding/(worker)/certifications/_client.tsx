"use client";

import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { useOnboardingFormNavigate } from "@/features/onboarding/hooks/use-onboarding-form-navigate";
import { certificationsAction } from "./_action";
import { useActionState } from "react";
import { CertificationsForm } from "@/features/profile/components/certifications-form";

interface CertificationsFormProps {
    initialCertifications?:
      | { name: string; file_url: string }[];
  }

export function CertificationsClient({ initialCertifications }: CertificationsFormProps) {
    const [state, formAction] = useActionState(certificationsAction, undefined);
    useOnboardingFormNavigate(state);

    return (
        <form action={formAction}>
            <CertificationsForm initialCertifications={initialCertifications} />
            <ContinueButton />
        </form>
    );
}