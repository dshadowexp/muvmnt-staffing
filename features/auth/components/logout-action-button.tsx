"use client";

import { ActionButton } from "@/components/ui/action-button";
import { useRouter } from "@/i18n/navigation";
import { logout } from "@/services/firebase/auth";
import { LogOutIcon } from "lucide-react";
import { posthog } from "posthog-js";
import { useTranslations } from "next-intl";
import { useAuth } from "../providers/auth-provider";
import { LoadingSwap } from "@/components/ui/loading-swap";

export function LogoutActionButton() {
    const { loading, firebaseUser } = useAuth();
    const router = useRouter();
    const tAccount = useTranslations("dashboard.accountMenu");
    const tErrors = useTranslations("auth.errors");

    const handleLogout = async (): Promise<{ error: boolean; message?: string }> => {
        try {
            posthog.capture("user_logged_out");
            posthog.reset();
            await logout();
            router.push("/sign-in");
            return { error: false };
        } catch {
            return { error: true, message: tErrors("generic") };
        }
    };

    return (
        <>
            <ActionButton
                disabled={loading || !firebaseUser} 
                action={handleLogout}
                requireAreYouSure
                areYouSureTitle={tAccount("logoutConfirmTitle")}
                areYouSureDescription={tAccount("logoutConfirmDescription")}
                confirmText={tAccount("logout")}
                cancelText={tAccount("cancel")}
                variant="outline"
                size="icon"
                aria-label={tAccount("logoutAria")}
            >
                <LoadingSwap isLoading={loading}>
                    <LogOutIcon className="size-4" />
                </LoadingSwap>
            </ActionButton>
        </>
    );
}