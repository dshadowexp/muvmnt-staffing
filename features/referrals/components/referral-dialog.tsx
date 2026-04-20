"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ReferralView,
  type ReferralRole,
} from "@/features/referrals/components/referral-view";

/**
 * Compact dialog wrapper around `ReferralView`. Kept as a thin shell so the
 * sidebar trigger and any future inline entry-points share identical content
 * with the full `/referrals` page.
 */
export function ReferralDialog({
  open,
  onOpenChange,
  role,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: ReferralRole;
}) {
  const t = useTranslations("referral.dialog");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(90vh,640px)] gap-4 overflow-y-auto sm:max-w-md"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <ReferralView role={role} enabled={open} />
      </DialogContent>
    </Dialog>
  );
}
