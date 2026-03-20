"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { WorkerAuthorizationForm } from "@/features/profile/components/worker-authorization-form";
import { FormErrors } from "@/types";
import { certificationsAction } from "./_action";
import { useActionState } from "react";
import { CertificationsForm } from "@/features/profile/components/certifications-form";

const initialState: FormErrors = {}

interface CertificationsFormProps {
    initialCertifications?:
      | { name: string; file_url: string }[];
  }

export function CertificationsClient({ initialCertifications }: CertificationsFormProps) {
    const [serverErrors, formAction] = useActionState(certificationsAction, initialState);

    useEffect(() => {
        if (serverErrors?.error) {
            toast.error(serverErrors.error);
        }
    }, [serverErrors]);

    return (
        <form action={formAction}>
            <CertificationsForm initialCertifications={initialCertifications} />
            <ContinueButton />
        </form>
    );
}