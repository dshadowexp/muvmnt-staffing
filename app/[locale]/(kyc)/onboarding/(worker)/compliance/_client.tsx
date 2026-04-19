"use client";

import * as React from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { useOnboardingFormNavigate } from "@/features/onboarding/hooks/use-onboarding-form-navigate";
import { ComplianceDocumentsSection } from "@/features/profile/components/compliance-documents-section";
import type { ComplianceDocumentSavedRow } from "@/features/profile/types/compliance-documents";
import { useRouter } from "@/i18n/navigation";
import { complianceAction } from "./_action";
import { useOnboardingSkip } from "@/features/onboarding/hooks/use-onboarding-skip";

export type ComplianceOnboardingRow = ComplianceDocumentSavedRow;

export function ComplianceOnboardingClient({
  compliancesPromise,
}: {
  compliancesPromise: Promise<ComplianceOnboardingRow[]>;
}) {
  const router = useRouter();
  const rows = React.use(compliancesPromise);
  const [state, formAction] = useActionState(complianceAction, undefined);
  useOnboardingFormNavigate(state);
  const { skipForm, skipSlot, skipPending } = useOnboardingSkip();
  const t = useTranslations("kyc.onboarding.forms.compliance");

  return (
    <>
      {skipForm}
      <form action={formAction} className="space-y-6">
        <div className="space-y-3">
          <ComplianceDocumentsSection
            serverRows={rows}
            translationNamespace="kyc.onboarding.forms.compliance"
            onRecordsChange={() => router.refresh()}
          />
        </div>

        <ContinueButton skipSlot={skipSlot} skipPending={skipPending} />
      </form>
    </>
  );
}
