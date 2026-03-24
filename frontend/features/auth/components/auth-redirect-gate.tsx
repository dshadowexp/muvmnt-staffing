"use client";

import { useEffect } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { useAuthRedirect } from "@/features/auth/use-auth-redirect";
import { useRouter, usePathname } from "@/i18n/navigation";

export function AuthRedirectGate({ children }: { children: React.ReactNode }) {
    const { firebaseUser, authUser, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const redirectTo = useAuthRedirect();

    useEffect(() => {
        if (loading) return;
        if (!firebaseUser) return;
        if (!authUser) return;

        const isAuthPage =
            pathname?.includes("sign-in") ||
            pathname?.includes("sign-up") ||
            pathname?.includes("forgot-password");

        if (isAuthPage) router.replace(redirectTo);
    }, [loading, firebaseUser, authUser, pathname, redirectTo, router]);

    return <>{children}</>;
}