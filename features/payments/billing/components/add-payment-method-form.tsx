"use client";

import { Button } from "@/components/ui/button";
import {
    PaymentElement,
    useElements,
    useStripe,
} from "@stripe/react-stripe-js";
import { CircleDashedIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type SubmitEventHandler } from "react";
import { toast } from "sonner";

export function AddPaymentMethodForm({
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
