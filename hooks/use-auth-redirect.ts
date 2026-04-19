"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Query-string keys that should survive when the user navigates between auth
 * pages (sign-in ↔ sign-up ↔ forgot-password) so the post-auth redirect target
 * — and the signup intent / referral code — is never lost.
 */
const PRESERVED_AUTH_PARAM_KEYS = ["redirect", "as", "ref"] as const;

const DEFAULT_REDIRECT = "/app";

export type UseAuthRedirect = {
    /** Safe post-auth redirect target. `/app` when missing or invalid. */
    redirectTo: string;
    /**
     * Copy preserved auth params (`redirect`, `as`, `ref`) onto an outbound
     * link. Use this on every `<Link>` that points from one auth page to
     * another so the post-auth target survives the bounce.
     */
    withAuthParams: (href: string) => string;
};

export function useAuthRedirect(): UseAuthRedirect {
    const searchParams = useSearchParams();

    const redirectTo = useMemo(() => {
        const raw = searchParams.get("redirect");
        if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
            return DEFAULT_REDIRECT;
        }
        return raw;
    }, [searchParams]);

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
