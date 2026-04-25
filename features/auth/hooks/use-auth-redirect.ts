"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../providers/auth-provider";

const PRESERVED_AUTH_PARAM_KEYS = ["redirect", "as", "ref"] as const;

const DEFAULT_REDIRECT = "/dashboard";

export type UseAuthRedirect = {
    redirectTo: string;
    withAuthParams: (href: string) => string;
};

export function useAuthRedirect(): UseAuthRedirect {
    const { authUser } = useAuth();
    const searchParams = useSearchParams();

    const redirectTo = useMemo(() => {
        const raw = searchParams.get("redirect");
        if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
            // Role-aware default so admins skip the /dashboard → /dashboard/admin server redirect
            if (authUser?.role === "admin") return "/dashboard/admin";
            return DEFAULT_REDIRECT;
        }
        return raw;
    }, [searchParams, authUser?.role]);
    

    const withAuthParams = useCallback(
        (href: string): string => {
            const carry = new URLSearchParams();
            for (const key of PRESERVED_AUTH_PARAM_KEYS) {
                const value = searchParams.get(key);
                if (value) carry.set(key, value);
            }
            const qs = carry.toString();
            if (!qs) return href;

            const [path, existing] = href.split("?");
            return `${path}?${existing ? `${existing}&${qs}` : qs}`;
        },
        [searchParams],
    );

    return { redirectTo, withAuthParams };
}
