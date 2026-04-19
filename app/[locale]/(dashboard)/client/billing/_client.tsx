"use client";

import { PaymentMethodList } from "@/features/payments/billing/components/payment-method-list";
import type { PaymentMethodCardType } from "@/features/payments/billing/types";
import {
  createSetupIntent,
  syncDefaultPaymentMethodAfterSetupIntent,
} from "@/features/payments/billing/dal/mutations";
import { useRouter } from "next/navigation";
import getStripeBrowser, {
  DARK_APPEARANCE,
  LIGHT_APPEARANCE,
} from "@/services/stripe/client";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2Icon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState, type SubmitEventHandler } from "react";
import { toast } from "sonner";

export function ClientAccountBillingPanel({
  initialPaymentMethods,
  billingSummary,
}: {
  initialPaymentMethods: PaymentMethodCardType[];
  billingSummary: { customerId: string } | null;
}) {
  const [cards, setCards] = useState(initialPaymentMethods);
  const stripePromise = useMemo(() => getStripeBrowser(), []);
  const { resolvedTheme } = useTheme();
  const [loading, setLoading] = useState(initialPaymentMethods.length === 0);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const appearance = resolvedTheme === "dark" ? DARK_APPEARANCE : LIGHT_APPEARANCE;

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

  return (
    <div className="space-y-6">
      {cards.length > 0 ? (
        <PaymentMethodList
          initialCards={cards}
          onDelete={(id) => setCards((prev) => prev.filter((c) => c.id !== id))}
        />
      ) : null}

      {cards.length === 0 ? (
        loading ? (
          <Loader2Icon className="text-muted-foreground size-6 animate-spin" />
        ) : !clientSecret ? (
          <p className="text-destructive text-sm">Could not load payment form.</p>
        ) : (
          <Elements
            key={resolvedTheme ?? "light"}
            stripe={stripePromise}
            options={{
              appearance,
              clientSecret,
              currency: "cad",
              loader: "auto",
            }}
          >
            <AccountAddPaymentForm />
          </Elements>
        )
      ) : null}
    </div>
  );
}

function AccountAddPaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
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
      const res = await syncDefaultPaymentMethodAfterSetupIntent(setupIntent.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Payment method saved.");
        router.refresh();
      }
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "accordion" }} />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2Icon className="mr-2 size-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Add payment method"
        )}
      </Button>
    </form>
  );
}
