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

    if (firebaseUser || authUser) {
        return (
            <div className="flex min-h-svh flex-col items-center justify-center gap-4">
                <div className="flex min-h-svh flex-col items-center justify-center gap-4">
                    <CircleDashedIcon className="size-10 animate-spin" />
                </div>
            </div>
        )
    }

    return <>{children}</>;
}