"use client";

import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { getAuthErrorKey, loginWithGoogle } from "@/services/firebase/auth";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { LoadingSwap } from "@/components/ui/loading-swap";
import posthog from "posthog-js";

function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
    );
}

export function GoogleButton() {
    const { loading } = useAuth();
    const t = useTranslations("auth");
    const tErrors = useTranslations("auth.errors");

    const handleGoogle = async () => {
        if (loading) return;
        try {
            await loginWithGoogle();
            posthog.capture("user_signed_in_with_google", { method: "google" });
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
            onClick={handleGoogle}
            disabled={loading}
            className="w-full gap-2.5 text-[0.9rem] font-medium"
        >
            <GoogleIcon />
            <LoadingSwap isLoading={loading}>
                <span>{t("google")}</span>
            </LoadingSwap>
        </Button>
    );
}
