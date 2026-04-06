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
import { createSetupIntent } from "@/features/billing/dal/mutations";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { env } from "@/data/env/client";

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
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        if (!stripe || !elements) return;

        const { error } = await stripe.confirmSetup({
            elements,
            confirmParams: {
                return_url: `${env.NEXT_PUBLIC_APP_URL}/onboarding/billing`,
            },
        });

        if (error) {
            if (error.type === "card_error" || error.type === "validation_error") {
                toast.error(error.message ?? "Payment failed");
            } else {
                toast.error("An unexpected error occurred.");
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