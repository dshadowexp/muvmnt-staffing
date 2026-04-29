"use client";

import posthog from "posthog-js";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LoadingSwap } from "@/components/ui/loading-swap";
import {
    getAuthErrorKey,
    loginWithMicrosoft,
} from "@/services/firebase/auth";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { cn } from "@/lib/utils";

function MicrosoftIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M1 1h7v7H1V1z" fill="#F25022" />
            <path d="M10 1h7v7h-7V1z" fill="#7FBA00" />
            <path d="M1 10h7v7H1v-7z" fill="#00A4EF" />
            <path d="M10 10h7v7h-7v-7z" fill="#FFB900" />
        </svg>
    );
}

export function MicrosoftButton({
    text = "Microsoft",
    className,
    disabled = false,
}: {
    text?: string;
    className?: string;
    disabled?: boolean;
}) {
    const tErrors = useTranslations("auth.errors");
    const { loading } = useAuth();
    const busy = loading || disabled;

    const handleMicrosoft = async () => {
        if (busy) return;
        try {
            await loginWithMicrosoft();
            posthog.capture("user_signed_in_with_microsoft", { method: "microsoft" });
        } catch (err) {
            const key = getAuthErrorKey(err);
            if (key) toast.error(tErrors(key));
            posthog.captureException(err);
        }
    };

    return (
        <Button
            type="button"
            variant="outline"
            onClick={handleMicrosoft}
            disabled={busy}
            className={cn(
                "gap-2.5 text-[0.9rem] font-medium",
                className ?? "w-full",
            )}
        >
            <MicrosoftIcon />
            <LoadingSwap isLoading={busy}>
                <span>{text}</span>
            </LoadingSwap>
        </Button>
    );
}