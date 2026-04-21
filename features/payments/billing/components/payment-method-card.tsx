"use client";

import type { MouseEvent } from "react";
import { CheckCircle2, CircleDashedIcon, CreditCard, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PaymentMethodCardType } from "../types";

function brandLabel(brand: string): string {
  const map: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "Amex",
    discover: "Discover",
    unionpay: "UnionPay",
    jcb: "JCB",
    diners: "Diners",
    unknown: "Card",
  };
  return map[brand.toLowerCase()] ?? brand;
}

export function PaymentMethodCard({
  card,
  onDelete,
  onSelectAsDefault,
  deleting = false,
  settingDefault = false,
}: {
  card: PaymentMethodCardType;
  onDelete: () => Promise<void>;
  onSelectAsDefault?: () => Promise<void>;
  deleting?: boolean;
  settingDefault?: boolean;
}) {
  const t = useTranslations("kyc.onboarding.forms.billing");
  const tDash = useTranslations("dashboard.client.billing");
  const exp = `${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}`;

  const handleDelete = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (deleting) return;
    await onDelete();
  };

  const handleRowClick = () => {
    if (card.isDefault || !onSelectAsDefault || settingDefault || deleting) return;
    void onSelectAsDefault();
  };

  return (
    <div
      role={!card.isDefault && onSelectAsDefault ? "button" : undefined}
      tabIndex={!card.isDefault && onSelectAsDefault ? 0 : undefined}
      onClick={() => void handleRowClick()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          void handleRowClick();
        }
      }}
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-card-foreground shadow-sm ring-1 ring-foreground/5 transition-opacity",
        deleting && "pointer-events-none opacity-50",
        !card.isDefault &&
          onSelectAsDefault &&
          "cursor-pointer hover:border-primary/40 hover:bg-muted/30",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div className="flex w-6 shrink-0 justify-center">
          {card.isDefault ? (
            <CheckCircle2
              className="size-5 shrink-0 text-primary"
              aria-label={tDash("defaultCardBadge")}
            />
          ) : settingDefault ? (
            <CircleDashedIcon className="size-4 text-muted-foreground" />
          ) : (
            <span className="size-5 shrink-0" aria-hidden />
          )}
        </div>
        <CreditCard className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="truncate text-sm font-medium">
          {brandLabel(card.brand)} ···· {card.last4}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{exp}</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        disabled={deleting}
        onClick={handleDelete}
        title={t("removeCard")}
        aria-label={t("removeCard")}
      >
        {deleting ? <CircleDashedIcon className="size-3.5" /> : <Trash2 className="size-3.5" />}
      </Button>
    </div>
  );
}
