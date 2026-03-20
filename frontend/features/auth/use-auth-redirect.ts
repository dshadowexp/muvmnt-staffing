"use client";

import { useSearchParams } from "next/navigation";

export function useAuthRedirect() {
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get("redirect");

    if (!redirectTo || !redirectTo.startsWith('/')) {
        return '/app';
    }

    return redirectTo;
}