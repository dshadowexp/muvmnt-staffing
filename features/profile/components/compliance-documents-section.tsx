"use client";

import { CircleDashedIcon, Trash2Icon, Upload, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  COMPLIANCE_IDS,
  COMPLIANCE_IDS_SET,
  type ComplianceId,
} from "@/lib/compliance";
import {
  saveComplianceAction,
  deleteComplianceAction,
} from "@/features/profile/actions/compliance-actions";
import type { ComplianceDocumentSavedRow } from "@/features/profile/types/compliance-documents";
import {
  getFilenameFromKey,
  uploadFileToStorage,
} from "@/features/storage/components/file-input";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TablePagination,
  useTablePagination,
} from "@/components/table-pagination";

export type ComplianceDocumentsNamespace =
  | "kyc.onboarding.forms.compliance"
  | "dashboard.worker.compliance";

type DraftRow = { draftId: string; name: ComplianceId };

type DisplayRow =
  | { kind: "draft"; draftId: string; name: ComplianceId }
  | {
      kind: "saved";
      id: string;
      name: string;
      fileUrl: string | null;
      isVerified: boolean;
      createdAt: string;
    };

export interface ComplianceDocumentsSectionProps {
  serverRows: ComplianceDocumentSavedRow[];
  translationNamespace: ComplianceDocumentsNamespace;
  onRecordsChange: () => void;
  className?: string;
}

export function ComplianceDocumentsSection({
  serverRows,
  translationNamespace,
  onRecordsChange,
  className,
}: ComplianceDocumentsSectionProps) {
  const t = useTranslations(translationNamespace);
  const tComp = useTranslations("compliance");
  const complianceRowLabel = (id: string) =>
    COMPLIANCE_IDS_SET.has(id) ? tComp(id) : id;
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [selectNonce, setSelectNonce] = useState(0);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadRef = useRef<
    | { kind: "draft"; draftId: string; name: ComplianceId }
    | { kind: "saved"; complianceId: string; name: string }
    | null
  >(null);

  const serverNames = useMemo(
    () => new Set(serverRows.map((r) => r.name)),
    [serverRows],
  );

  const available = useMemo(
    () =>
      COMPLIANCE_IDS.filter(
        (id) =>
          !serverNames.has(id) &&
          !drafts.some((d) => d.name === id),
      ),
    [serverNames, drafts],
  );

  const displayRows: DisplayRow[] = useMemo(() => {
    const draftDisplay: DisplayRow[] = drafts.map((d) => ({
      kind: "draft" as const,
      draftId: d.draftId,
      name: d.name,
    }));
    const savedDisplay: DisplayRow[] = serverRows.map((r) => ({
      kind: "saved" as const,
      id: r.id,
      name: r.name,
      fileUrl: r.fileUrl,
      isVerified: r.isVerified,
      createdAt: r.createdAt,
    }));
    return [...draftDisplay, ...savedDisplay];
  }, [drafts, serverRows]);

  const pagination = useTablePagination(displayRows);

  const handlePickType = useCallback((value: string) => {
    const name = value as ComplianceId;
    setDrafts((prev) => [
      ...prev,
      { draftId: crypto.randomUUID(), name },
    ]);
    setSelectNonce((n) => n + 1);
  }, []);

  const removeDraft = useCallback((draftId: string) => {
    setDrafts((prev) => prev.filter((d) => d.draftId !== draftId));
  }, []);

  const triggerDraftFilePick = useCallback(
    (draftId: string, name: ComplianceId) => {
      pendingUploadRef.current = { kind: "draft", draftId, name };
      queueMicrotask(() => fileInputRef.current?.click());
    },
    [],
  );

  const triggerSavedFilePick = useCallback((complianceId: string, name: string) => {
    pendingUploadRef.current = { kind: "saved", complianceId, name };
    queueMicrotask(() => fileInputRef.current?.click());
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      const pending = pendingUploadRef.current;
      pendingUploadRef.current = null;
      if (!file || !pending) return;

      const uploadKey =
        pending.kind === "draft"
          ? `draft:${pending.draftId}`
          : `saved:${pending.complianceId}`;
      setUploadingKey(uploadKey);

      void (async () => {
        try {
          const { key } = await uploadFileToStorage({
            file,
            context: "compliance",
          });
          const res = await saveComplianceAction({
            name: pending.name as ComplianceId,
            file_url: key,
          });
          if (res.error) {
            toast.error(res.message);
            return;
          }
          toast.success(res.message);
          if (pending.kind === "draft") {
            setDrafts((prev) =>
              prev.filter((d) => d.draftId !== pending.draftId),
            );
          }
          onRecordsChange();
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : t("picker.saveFailed"),
          );
        } finally {
          setUploadingKey(null);
        }
      })();
    },
    [onRecordsChange, t],
  );

  const runDelete = useCallback(
    async (id: string) => {
      const data = await deleteComplianceAction(id);
      if (!data.error) {
        toast.success(data.message);
        onRecordsChange();
      }
      return data;
    },
    [onRecordsChange],
  );

  const empty = displayRows.length === 0;

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="sr-only"
        onChange={handleFileChange}
      />

      <div className="space-y-2">
        <p className="text-muted-foreground text-xs mb-2">{t("picker.helper")}</p>
        <Select key={selectNonce} onValueChange={handlePickType}>
          <SelectTrigger
            className="w-full"
            disabled={available.length === 0}
            aria-label={t("picker.selectType")}
          >
            <SelectValue
              placeholder={
                available.length > 0
                  ? t("picker.selectType")
                  : t("picker.allAdded")
              }
            />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {available.map((id) => (
              <SelectItem key={id} value={id}>
                <span className="font-medium">{tComp(id)}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {empty ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/15 px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columnDocument")}</TableHead>
                <TableHead>{t("columnFile")}</TableHead>
                <TableHead>{t("columnStatus")}</TableHead>
                <TableHead className="text-right">
                  {t("columnActions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.rows.map((row) =>
                row.kind === "draft" ? (
                  <TableRow key={`draft-${row.draftId}`}>
                    <TableCell className="font-medium">
                      {complianceRowLabel(row.name)}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        aria-label={t("uploadAria")}
                        disabled={uploadingKey === `draft:${row.draftId}`}
                        onClick={() =>
                          triggerDraftFilePick(row.draftId, row.name)
                        }
                      >
                        {uploadingKey === `draft:${row.draftId}` ? (
                          <CircleDashedIcon className="size-4 shrink-0 animate-spin" />
                        ) : (
                          <Upload className="size-4 shrink-0" />
                        )}
                        {t("uploadFile")}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t("statusNotUploaded")}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t("removeDraftAria")}
                        title={t("removeDraftAria")}
                        disabled={uploadingKey === `draft:${row.draftId}`}
                        onClick={() => removeDraft(row.draftId)}
                      >
                        <X className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {complianceRowLabel(row.name)}
                    </TableCell>
                    <TableCell className="max-w-[min(100vw,20rem)]">
                      {row.fileUrl ? (
                        <span
                          className="block truncate font-mono text-xs text-foreground"
                          title={row.fileUrl}
                        >
                          {getFilenameFromKey(row.fileUrl)}
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          aria-label={t("uploadAria")}
                          disabled={uploadingKey === `saved:${row.id}`}
                          onClick={() =>
                            triggerSavedFilePick(row.id, row.name)
                          }
                        >
                          {uploadingKey === `saved:${row.id}` ? (
                            <CircleDashedIcon className="size-4 shrink-0 animate-spin" />
                          ) : (
                            <Upload className="size-4 shrink-0" />
                          )}
                          {t("uploadFile")}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={row.isVerified ? "default" : "secondary"}
                      >
                        {row.isVerified
                          ? t("statusVerified")
                          : t("statusPending")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {row.fileUrl ? (
                        <ActionButton
                          size="icon-sm"
                          variant="ghost"
                          aria-label={t("removeAria", {
                            name: complianceRowLabel(row.name),
                          })}
                          action={() => runDelete(row.id)}
                          requireAreYouSure
                          areYouSureTitle={t("removeDialogTitle")}
                          areYouSureDescription={
                            <>
                              {t("removeDialogBodyPrefix")}
                              <span className="font-medium">
                                {complianceRowLabel(row.name)}
                              </span>
                              {t("removeDialogBodySuffix")}
                            </>
                          }
                          disabled={row.isVerified}
                          title={
                            row.isVerified
                              ? t("removeDisabledVerified")
                              : undefined
                          }
                          cancelText={t("cancelButton")}
                          confirmText={t("removeButton")}
                        >
                          <Trash2Icon className="size-4" />
                        </ActionButton>
                      ) : (
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={t("removeDraftAria")}
                          title={t("removeDraftAria")}
                          disabled={uploadingKey === `saved:${row.id}`}
                          onClick={() => runDelete(row.id)}
                        >
                          <X className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
          {pagination.pageCount > 1 && (
            <TablePagination
              totalRows={pagination.totalRows}
              pageIndex={pagination.pageIndex}
              pageSize={pagination.pageSize}
              pageCount={pagination.pageCount}
              onPageChange={pagination.setPageIndex}
              onPageSizeChange={pagination.setPageSize}
            />
          )}
        </div>
      )}
    </div>
  );
}
