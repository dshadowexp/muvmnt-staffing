"use client";

import type { MouseEvent } from "react";
import { CreditCard, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PaymentMethodCardType } from "../types";
import { toast } from "sonner";

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
    deleting = false,
}: {
    card: PaymentMethodCardType;
    onDelete: () => Promise<void>;
    deleting?: boolean;
}) {
    const t = useTranslations("kyc.onboarding.forms.billing");
    const exp = `${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}`;

    const handleDelete = async (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (deleting) return;
        try {
            await onDelete();
        } catch {
            toast.error(t("deleteFailed"));
        }
    };

    return (
        <div
            className={cn(
                "flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-card-foreground shadow-sm ring-1 ring-foreground/5 transition-opacity",
                deleting && "pointer-events-none opacity-50",
            )}
        >
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
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
                    {deleting ? <Spinner className="size-3.5" /> : <Trash2 className="size-3.5" />}
                </Button>
        </div>
    );
}
