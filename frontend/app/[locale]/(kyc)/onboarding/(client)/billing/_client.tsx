"use client";

import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { useOnboardingFormNavigate } from "@/features/onboarding/hooks/use-onboarding-form-navigate";
import { SubmitEventHandler, useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { billingAction } from "./_action";
import { CardSummary } from "@/features/billing/dal/queries";
import { PaymentMethodList } from "@/features/billing/components/payment-method-list";
import { useTheme } from "next-themes";
import getStripeBrowser, { DARK_APPEARANCE, LIGHT_APPEARANCE } from "@/services/stripe/client";
import {
  createSetupIntent,
  syncDefaultPaymentMethodAfterSetupIntent,
} from "@/features/billing/dal/mutations";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function BillingClient({ initialPaymentMethods }: { initialPaymentMethods?: CardSummary[] }) {
    const [cards, setCards] = useState<CardSummary[]>(initialPaymentMethods ?? []);
    const stripePromise = useMemo(() => getStripeBrowser(), []);
    const { resolvedTheme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [billingState, action] = useActionState(billingAction, undefined);
    useOnboardingFormNavigate(billingState);
    const appearance = resolvedTheme === "dark" ? DARK_APPEARANCE : LIGHT_APPEARANCE;

    useEffect(() => {
        setCards(initialPaymentMethods ?? []);
    }, [initialPaymentMethods]);

    useEffect(() => {
        let cancelled = false;

        async function init() {
            try {
                setLoading(true);
                const { error, data } = await createSetupIntent();
                if (cancelled) return;
                if (error) throw new Error(error);
                setClientSecret(data?.clientSecret ?? null);
            } catch (error) {
                if (!cancelled) {
                    toast.error(error instanceof Error ? error.message : "Failed to load payment form");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void init();
        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return (
            <Loader2 className="size-4 animate-spin" />
        );
    }

    if (!clientSecret) {
        return (
            <div className="py-5 text-sm text-destructive">
                Failed to load payment form.
            </div>
        );
    }

    return (
        <>
            {cards.length > 0 ? (
                <form action={action} className="space-y-6">
                    <PaymentMethodList
                        initialCards={cards}
                        onDelete={(id) => setCards((prev) => prev.filter((c) => c.id !== id))}
                    />
                    <ContinueButton text="Finish" />
                </form>
            ) : (
                <Elements
                    key={resolvedTheme ?? "light"}
                    stripe={stripePromise}
                    options={{ appearance, clientSecret, currency: "cad", loader: "auto" }}
                >
                    <PaymentForm />
                </Elements>
            )}
        </>
    );
}

function PaymentForm() {
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
        <form id="payment-form" onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement id="payment-element" options={{ layout: "accordion" }} />
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <ContinueButton text="Save" />}
        </form>
    );
}