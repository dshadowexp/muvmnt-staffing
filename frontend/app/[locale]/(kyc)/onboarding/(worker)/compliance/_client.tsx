"use client";

import * as React from "react";
import { format } from "date-fns";
import { Loader2, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { useOnboardingFormNavigate } from "@/features/onboarding/hooks/use-onboarding-form-navigate";
import { ComplianceForm } from "@/features/profile/components/compliance-form";
import { deleteComplianceAction } from "@/features/profile/actions/compliance-actions";
import { useRouter } from "@/i18n/navigation";
import { complianceAction } from "./_action";

export type ComplianceOnboardingRow = {
  id: string;
  name: string;
  fileUrl: string | null;
  isVerified: boolean;
  createdAt: string;
};

export function ComplianceOnboardingClient({
  compliancesPromise,
}: {
  compliancesPromise: Promise<ComplianceOnboardingRow[]>;
}) {
  const router = useRouter();
  const rows = React.use(compliancesPromise);
  const [state, formAction] = useActionState(complianceAction, undefined);
  useOnboardingFormNavigate(state);
  const t = useTranslations("kyc.onboarding.forms.compliance");

  const [addOpen, setAddOpen] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<ComplianceOnboardingRow | null>(
    null,
  );
  const [isDeleting, startDelete] = React.useTransition();

  function handleAddChange(open: boolean) {
    setAddOpen(open);
    if (!open) router.refresh();
  }

  function handleConfirmDelete() {
    if (!toDelete) return;
    startDelete(async () => {
      const res = await deleteComplianceAction(toDelete.id);
      if (res.error) {
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
      setToDelete(null);
      router.refresh();
    });
  }

  const existingNames = React.useMemo(() => rows.map((r) => r.name), [rows]);

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-muted-foreground text-sm">{t("intro")}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAddOpen(true)}
            className="gap-2"
          >
            <PlusIcon className="size-4" />
            {t("addButton")}
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/15 px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columnDocument")}</TableHead>
                  <TableHead>{t("columnStatus")}</TableHead>
                  <TableHead>{t("columnUploaded")}</TableHead>
                  <TableHead className="text-right">{t("columnActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      <Badge variant={r.isVerified ? "default" : "secondary"}>
                        {r.isVerified ? t("statusVerified") : t("statusPending")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(r.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t("removeAria", { name: r.name })}
                        disabled={r.isVerified}
                        onClick={() => setToDelete(r)}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <ContinueButton />

      <Dialog open={addOpen} onOpenChange={handleAddChange}>
        <DialogContent
          className="flex max-h-[min(90vh,720px)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
          showCloseButton
        >
          <DialogHeader className="border-border shrink-0 border-b px-6 py-4">
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <ComplianceForm
              existingNames={existingNames}
              onSaved={() => handleAddChange(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={toDelete != null}
        onOpenChange={(o) => {
          if (!o && !isDeleting) setToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!isDeleting}>
          <DialogHeader>
            <DialogTitle>{t("removeDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("removeDialogBodyPrefix")}
              {toDelete?.name ?? t("removeDialogDefaultName")}
              {t("removeDialogBodySuffix")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setToDelete(null)}
              disabled={isDeleting}
            >
              {t("cancelButton")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              {t("removeButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
