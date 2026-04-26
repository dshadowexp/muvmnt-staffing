"use client";

import { useEffect } from "react";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useAuthRedirect } from "@/features/auth/hooks/use-auth-redirect";
import { useRouter, usePathname } from "@/i18n/navigation";
import { CircleDashedIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";

const DEFAULT_REDIRECTS: Record<string, string> = {
    admin:     "/dashboard/admin",
    worker:    "/dashboard",
    client:    "/dashboard",
    candidate: "/s",
};

export function AuthRedirectGate({ children }: { children: React.ReactNode }) {
    const searchParams = useSearchParams();
    const { firebaseUser, authUser, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { redirectTo } = useAuthRedirect();
    console.log("redirectTo", redirectTo);

    const isAuthPage =
        pathname?.includes("sign-in") ||
        pathname?.includes("sign-up") ||
        pathname?.includes("forgot-password");

    useEffect(() => {
        if (loading) return;
        if (!firebaseUser) return;
        if (!authUser) return;
        if (!isAuthPage) return;
        
        const raw = searchParams.get("redirect");
        const safe = raw?.startsWith("/") && !raw.startsWith("//") ? raw : null;
        const destination = safe ?? DEFAULT_REDIRECTS[authUser.role] ?? "/dashboard";
        
        router.replace(destination);
    }, [loading, firebaseUser, authUser, isAuthPage, router, searchParams]);

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