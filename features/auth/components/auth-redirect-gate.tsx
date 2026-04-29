"use client";

import { useAuth } from "@/features/auth/providers/auth-provider";
import { CircleDashedIcon } from "lucide-react";

export function AuthRedirectGate({ children }: { children: React.ReactNode }) {
    const { loading } = useAuth();

    if (loading) {
        return (
            <div className="flex min-h-svh flex-col items-center justify-center gap-4">
                <CircleDashedIcon className="size-10 animate-spin" />
            </div>
        );
    }

    return <>{children}</>;
}