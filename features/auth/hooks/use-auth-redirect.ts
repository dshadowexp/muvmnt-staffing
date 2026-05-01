"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../providers/auth-provider";
import { ADMIN_ROLE, CANDIDATE_ROLE, OPERATOR_ROLE, STAFF_ROLE } from "../types";

const PRESERVED_AUTH_PARAM_KEYS = ["redirect", "as", "ref", "token"] as const;

const DEFAULT_REDIRECT = "/";

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
            if (authUser?.role === ADMIN_ROLE) return "/admin";
            if (authUser?.role === STAFF_ROLE) return "/staff";
            if (authUser?.role === OPERATOR_ROLE)
                return authUser.facilityId ? "/app" : "/onboarding";
            if (authUser?.role === CANDIDATE_ROLE) return "/s";
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
