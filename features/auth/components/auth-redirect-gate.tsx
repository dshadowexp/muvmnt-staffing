"use client";

import { useEffect } from "react";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useAuthRedirect } from "@/features/auth/hooks/use-auth-redirect";
import { useRouter, usePathname } from "@/i18n/navigation";
import { CircleDashedIcon } from "lucide-react";

export function AuthRedirectGate({ children }: { children: React.ReactNode }) {
    const { firebaseUser, authUser, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { redirectTo } = useAuthRedirect();

    const isAuthPage =
        pathname?.includes("sign-in") ||
        pathname?.includes("sign-up") ||
        pathname?.includes("forgot-password");

    useEffect(() => {
        if (loading) return;
        if (!firebaseUser) return;
        if (!authUser) return;
        if (!isAuthPage) return;

        router.replace(redirectTo);
    }, [loading, firebaseUser, authUser, isAuthPage, redirectTo, router]);

    if (!loading && firebaseUser && authUser && isAuthPage) {
        return (
            <div className="flex min-h-svh flex-col items-center justify-center gap-4">
                <CircleDashedIcon className="size-10 animate-spin" />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex min-h-svh flex-col items-center justify-center gap-4">
                <CircleDashedIcon className="size-10 animate-spin" />
            </div>
        );
    }

    return <>{children}</>;
}