"use client";

import { PaymentMethodList } from "@/features/payments/billing/components/payment-method-list";
import type { PaymentMethodCardType } from "@/features/payments/billing/types";
import {
  createSetupIntent,
  syncDefaultPaymentMethodAfterSetupIntent,
} from "@/features/payments/billing/dal/mutations";
import { useRouter } from "@/i18n/navigation";
import getStripeBrowser, {
  DARK_APPEARANCE,
  LIGHT_APPEARANCE,
} from "@/services/stripe/client";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CircleDashedIcon, Plus } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type SubmitEventHandler } from "react";
import { toast } from "sonner";

const MAX_CARD_METHODS = 3;

export function ClientAccountBillingPanel({
  initialPaymentMethods,
}: {
  initialPaymentMethods: PaymentMethodCardType[];
}) {
  const t = useTranslations("dashboard.client.billing");
  const [cards, setCards] = useState(initialPaymentMethods);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSecret, setDialogSecret] = useState<string | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  const stripePromise = useMemo(() => getStripeBrowser(), []);
  const { resolvedTheme } = useTheme();
  const [loading, setLoading] = useState(initialPaymentMethods.length === 0);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const appearance = resolvedTheme === "dark" ? DARK_APPEARANCE : LIGHT_APPEARANCE;
  const router = useRouter();

  useEffect(() => {
    setCards(initialPaymentMethods);
  }, [initialPaymentMethods]);

  useEffect(() => {
    if (cards.length > 0) {
      setClientSecret(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function init() {
      try {
        setLoading(true);
        const { error, data } = await createSetupIntent();
        if (cancelled) return;
        if (error) throw new Error(error);
        setClientSecret(data?.clientSecret ?? null);
      } catch (e) {
        if (!cancelled) {
          toast.error(
            e instanceof Error ? e.message : "Failed to load payment form",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [cards.length]);

  useEffect(() => {
    if (!dialogOpen) {
      setDialogSecret(null);
      return;
    }

    let cancelled = false;
    async function loadIntent() {
      setDialogLoading(true);
      setDialogSecret(null);
      try {
        const { error, data } = await createSetupIntent();
        if (cancelled) return;
        if (error) {
          toast.error(error);
          setDialogOpen(false);
          return;
        }
        setDialogSecret(data?.clientSecret ?? null);
      } catch (e) {
        if (!cancelled) {
          toast.error(
            e instanceof Error ? e.message : "Failed to load payment form",
          );
          setDialogOpen(false);
        }
      } finally {
        if (!cancelled) setDialogLoading(false);
      }
    }
    void loadIntent();
    return () => {
      cancelled = true;
    };
  }, [dialogOpen]);

  const canAddMore = cards.length < MAX_CARD_METHODS;
  const hasCards = cards.length > 0;

  return (
    <Card size="sm">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>{t("cardsTitle")}</CardTitle>
          <CardDescription>{t("cardsDescription")}</CardDescription>
        </div>
        {hasCards && canAddMore ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => setDialogOpen(true)}
            aria-label={t("addCardAria")}
            title={t("addCardAria")}
          >
            <Plus className="size-4" />
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {hasCards ? (
          <PaymentMethodList
            initialCards={cards}
            onDelete={(id) => setCards((prev) => prev.filter((c) => c.id !== id))}
            onDefaultChange={() => router.refresh()}
          />
        ) : null}

        {!hasCards ? (
          loading ? (
            <CircleDashedIcon className="text-muted-foreground size-6 animate-spin" />
          ) : !clientSecret ? (
            <p className="text-destructive text-sm">{t("couldNotLoadForm")}</p>
          ) : (
            <Elements
              key={`${resolvedTheme ?? "light"}-${clientSecret}`}
              stripe={stripePromise}
              options={{
                appearance,
                clientSecret,
                currency: "cad",
                loader: "auto",
              }}
            >
              <AddPaymentMethodForm
                setAsDefault={cards.length === 0}
                onSuccess={() => router.refresh()}
                submitLabel={t("addPaymentMethod")}
              />
            </Elements>
          )
        ) : null}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{t("addCardDialogTitle")}</DialogTitle>
              <DialogDescription>{t("addCardDialogDescription")}</DialogDescription>
            </DialogHeader>
            {dialogLoading ? (
              <div className="flex justify-center py-8">
                <CircleDashedIcon className="text-muted-foreground size-8 animate-spin" />
              </div>
            ) : dialogSecret ? (
              <Elements
                key={`dialog-${resolvedTheme ?? "light"}-${dialogSecret}`}
                stripe={stripePromise}
                options={{
                  appearance,
                  clientSecret: dialogSecret,
                  currency: "cad",
                  loader: "auto",
                }}
              >
                <AddPaymentMethodForm
                  setAsDefault={false}
                  onSuccess={() => {
                    setDialogOpen(false);
                    router.refresh();
                  }}
                  submitLabel={t("addPaymentMethod")}
                />
              </Elements>
            ) : (
              <p className="text-destructive text-sm">{t("couldNotLoadForm")}</p>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function AddPaymentMethodForm({
  setAsDefault,
  onSuccess,
  submitLabel,
}: {
  setAsDefault: boolean;
  onSuccess: () => void;
  submitLabel: string;
}) {
  const t = useTranslations("dashboard.client.billing");
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (!stripe || !elements) {
      setIsSubmitting(false);
      return;
    }

    const returnUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}`
        : "";

    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
      redirect: "if_required",
    });

    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        toast.error(error.message ?? "Payment failed");
      } else {
        toast.error("An unexpected error occurred.");
      }
      setIsSubmitting(false);
      return;
    }

    if (setupIntent?.status === "succeeded" && setupIntent.id) {
      const res = await syncDefaultPaymentMethodAfterSetupIntent(setupIntent.id, {
        setAsDefault,
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Payment method saved.");
        onSuccess();
      }
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "accordion" }} />
      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <CircleDashedIcon className="mr-2 size-4 animate-spin" />
            {t("savingPaymentMethod")}
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
}
