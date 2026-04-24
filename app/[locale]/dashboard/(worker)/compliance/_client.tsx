"use client";

import * as React from "react";
import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { ComplianceDocumentsSection } from "@/features/profile/components/compliance-documents-section";
import {
  WorkAuthCardSlot,
  IdentityVerificationCardSlot,
  SectionCardSkeleton,
  type WorkAuthData,
  type IdentityVerificationData,
} from "@/features/profile/components/worker-account-profile";
import type { ComplianceDocumentSavedRow } from "@/features/profile/types/compliance-documents";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LockIcon } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

export type CompliancesRow = ComplianceDocumentSavedRow;

type Props = {
  compliancesPromise: Promise<CompliancesRow[]>;
  workAuthPromise: Promise<WorkAuthData>;
  identityVerificationPromise: Promise<IdentityVerificationData>;
  stage?: string | null;
};

export function CompliancesClient({ compliancesPromise, workAuthPromise, identityVerificationPromise, stage }: Props) {
  const router = useRouter();
  const rows = React.use(compliancesPromise);
  const t = useTranslations("dashboard.worker.compliance");

  // Stage buckets — consistent with WorkAuthCardSlot / IdentityVerificationCardSlot
  const isLocked         = !stage || stage === "picture" || stage === "interview";
  const isCompliance     = stage === "compliance";
  const isPostCompliance = !isLocked && !isCompliance;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">
          {t("subtitle")}
        </p>
      </div>

      <Suspense fallback={<SectionCardSkeleton lines={3} />}>
        <WorkAuthCardSlot workAuthPromise={workAuthPromise} stage={stage} />
      </Suspense>

      <Suspense fallback={<SectionCardSkeleton lines={2} />}>
        <IdentityVerificationCardSlot identityVerificationPromise={identityVerificationPromise} stage={stage} />
      </Suspense>

      {/* Compliance documents
          - Locked:          hidden behind lock, interview-stage message
          - Compliance:      full upload UI
          - Post-compliance: full upload UI (worker can still add documents) */}
      <Card size="sm" className={isLocked ? "opacity-60" : undefined}>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle>{t("documentsTitle")}</CardTitle>
            <CardDescription>
              {isLocked
                ? t("documentsDescriptionInterview")
                : t("documentsDescription")}
            </CardDescription>
          </div>
          {isLocked && <LockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
        </CardHeader>
        {!isLocked && (
          <CardContent>
            <ComplianceDocumentsSection
              serverRows={rows}
              translationNamespace="dashboard.worker.compliance"
              onRecordsChange={() => router.refresh()}
            />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
