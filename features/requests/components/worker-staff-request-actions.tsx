"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowRightIcon, CheckCircle2Icon, CircleXIcon } from "lucide-react";

import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  confirmWorkerShiftsForRequestAction,
  declineWorkerShiftsForRequestAction,
} from "@/features/shifts/actions";

export function WorkerStaffRequestActions({
  requestId,
  hasScheduledShifts,
}: {
  requestId: string;
  hasScheduledShifts: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("dashboard.worker.requestDetail");
  const tCommon = useTranslations("common");
  const [busy, setBusy] = React.useState<"accept" | "decline" | null>(null);

  if (!hasScheduledShifts) return null;

  async function onAccept() {
    setBusy("accept");
    try {
      const res = await confirmWorkerShiftsForRequestAction(requestId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(t("acceptSuccess"));
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  /** Button base uses `whitespace-nowrap` + centered inline-flex — override so card copy wraps. */
  const cardButtonClass = cn(
    "group flex h-auto w-full min-w-0 flex-col items-stretch justify-start rounded-xl p-0 text-left shadow-none",
    "whitespace-normal text-pretty",
    "hover:bg-transparent",
    "disabled:pointer-events-none disabled:opacity-60",
  );

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">{t("actionsTitle")}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Button
          type="button"
          variant="ghost"
          className={cn(
            cardButtonClass,
            "text-left transition-opacity hover:opacity-95",
            "focus-visible:ring-2 focus-visible:ring-ring",
          )}
          disabled={busy != null}
          onClick={() => void onAccept()}
        >
          <Card
            className={cn(
              "pointer-events-none h-full w-full transition-shadow group-hover:shadow-md",
              "border-emerald-500/35 bg-emerald-500/[0.09] dark:bg-emerald-500/[0.12]",
              "group-hover:border-emerald-500/50 group-hover:bg-emerald-500/[0.14] dark:group-hover:bg-emerald-500/[0.16]",
            )}
          >
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex min-w-0 items-start gap-2">
                  <CheckCircle2Icon
                    className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden
                  />
                  <CardTitle className="min-w-0 flex-1 text-base leading-snug text-emerald-950 dark:text-emerald-50">
                    {busy === "accept" ? t("accepting") : t("accept")}
                  </CardTitle>
                </div>
                <CardDescription className="break-words leading-snug text-emerald-900/80 dark:text-emerald-100/80">
                  {t("acceptCardDescription")}
                </CardDescription>
              </div>
              <ArrowRightIcon className="size-5 shrink-0 text-emerald-700/70 transition-transform group-hover:translate-x-0.5 dark:text-emerald-300/70" />
            </CardHeader>
          </Card>
        </Button>

        <ActionButton
          type="button"
          variant="ghost"
          className={cn(
            cardButtonClass,
            "text-left transition-opacity hover:opacity-95",
            "focus-visible:ring-2 focus-visible:ring-ring",
          )}
          disabled={busy != null}
          action={async () => {
            setBusy("decline");
            try {
              const res = await declineWorkerShiftsForRequestAction(requestId);
              if (res.error) return { error: true, message: res.error };
              toast.success(t("declineSuccess"));
              router.refresh();
              return { error: false };
            } finally {
              setBusy(null);
            }
          }}
          requireAreYouSure
          areYouSureTitle={t("declineDialogTitle")}
          areYouSureDescription={t("declineConfirm")}
          cancelText={tCommon("cancel")}
          confirmText={t("decline")}
        >
          <Card
            className={cn(
              "pointer-events-none h-full w-full transition-shadow group-hover:shadow-md",
              "border-destructive/35 bg-destructive/[0.08] dark:bg-destructive/[0.12]",
              "group-hover:border-destructive/50 group-hover:bg-destructive/[0.12] dark:group-hover:bg-destructive/[0.16]",
            )}
          >
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex min-w-0 items-start gap-2">
                  <CircleXIcon
                    className="size-5 shrink-0 text-destructive"
                    aria-hidden
                  />
                  <CardTitle className="min-w-0 flex-1 text-base leading-snug">
                    {busy === "decline" ? t("declining") : t("decline")}
                  </CardTitle>
                </div>
                <CardDescription className="break-words leading-snug text-destructive/90">
                  {t("declineCardDescription")}
                </CardDescription>
              </div>
              <ArrowRightIcon className="text-muted-foreground size-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </CardHeader>
          </Card>
        </ActionButton>
      </div>
    </section>
  );
}
