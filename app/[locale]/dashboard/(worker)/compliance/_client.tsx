"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ComplianceDocumentsSection } from "@/features/profile/components/compliance-documents-section";
import type { ComplianceDocumentSavedRow } from "@/features/profile/types/compliance-documents";
import { useRouter } from "@/i18n/navigation";

export type CompliancesRow = ComplianceDocumentSavedRow;

type Props = {
  compliancesPromise: Promise<CompliancesRow[]>;
};

export function CompliancesClient({ compliancesPromise }: Props) {
  const router = useRouter();
  const rows = React.use(compliancesPromise);
  const t = useTranslations("dashboard.worker.compliance");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">
          {t("subtitle")}
        </p>
      </div>

      <ComplianceDocumentsSection
        serverRows={rows}
        translationNamespace="dashboard.worker.compliance"
        onRecordsChange={() => router.refresh()}
      />
    </div>
  );
}
