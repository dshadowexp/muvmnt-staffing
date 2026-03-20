"use client";

import {
    type User,
    onIdTokenChanged,
    sendEmailVerification,
} from "firebase/auth";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { auth } from "@/services/firebase/client";
import { exchangeToken, ExchangeTokenError } from "@/lib/api/auth";
import { deleteSession } from "@/lib/session";
import { UserRole } from "@/types/auth";
import { useAuthRedirect } from "@/features/auth/use-auth-redirect";
import { useRouter, usePathname } from "@/i18n/navigation";
import { setCookie, deleteCookie } from "cookies-next";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthContextType = {
    user:               User | null;
    loading:            boolean;
    /** Non-null when the last token exchange failed after all retries.
     *  kind "unauthorized" = account issue; "server_error"/"network" = transient.
     *  Call retryTokenExchange() to try again, or logout() to start fresh. */
    tokenExchangeError: ExchangeTokenError | null;
    retryTokenExchange: () => Promise<void>;
    sendVerifyEmail: () => Promise<void>;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);



// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser]                             = useState<User | null>(null);
    const [loading, setLoading]                       = useState(true);
    const [tokenExchangeError, setTokenExchangeError] = useState<ExchangeTokenError | null>(null);
    const router = useRouter();
    const pathname = usePathname();
    const redirectTo = useAuthRedirect();

    // pendingRole carries the role from signUp/loginWithGoogle into the
    // onIdTokenChanged listener. A ref (not state) avoids closure staleness —
    // the listener always reads the latest value without needing to re-subscribe.
    const pendingRoleRef = useRef<UserRole | null>(null);
    const pathnameRef = useRef(pathname);
    const redirectToRef = useRef(redirectTo);
    pathnameRef.current = pathname;
    redirectToRef.current = redirectTo;

    // ── Shared exchange logic ─────────────────────────────────────────────────
    // Used by both the listener and retryTokenExchange().

    async function runTokenExchange(firebaseUser: User) {
        const firebaseToken = await firebaseUser.getIdToken();

        await exchangeToken(
            firebaseToken,
            pendingRoleRef.current ?? undefined,
            // 401 retry: force-refresh the Firebase token and try once more
            () => firebaseUser.getIdToken(true),
        );

        pendingRoleRef.current = null; // clear only after a successful exchange
        setTokenExchangeError(null);
        await setCookie("__session", firebaseToken);
    }

    useEffect(() => {
        // ── Single listener: handles sign-in, sign-up, sign-out, token rotation ──
        const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                deleteSession();
                await deleteCookie("__session");
                setUser(null);
                setTokenExchangeError(null);
                setLoading(false);
                router.push("/sign-in");
                return;
            }

            try {
                await runTokenExchange(firebaseUser);
            } catch (err) {
                // Classify the error — ExchangeTokenError already has kind + retryable
                const exchangeErr = err instanceof ExchangeTokenError
                    ? err
                    : new ExchangeTokenError("unknown", "Token exchange failed.");

                // Surface the error in context so the UI can act on it.
                // We do NOT clear the Firebase session here — the user is still
                // authenticated with Firebase. apiToken remains null until resolved.
                setTokenExchangeError(exchangeErr);

                console.error(
                    `[auth] Token exchange failed (${exchangeErr.kind}):`,
                    exchangeErr.message,
                );
            }

            // Always update user + loading regardless of exchange outcome.
            // Components gate on apiToken or tokenExchangeError, not just user.
            setUser(firebaseUser);
            setLoading(false);
            // Only redirect when coming from sign-in/sign-up — not on token refresh or when already on app pages
            const currentPath = pathnameRef.current;
            const isAuthPage =
                currentPath?.includes("sign-in") || currentPath?.includes("sign-up");
            if (isAuthPage) router.push(redirectToRef.current);
        });

        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // ← subscribe once; pathname/redirectTo read via ref

    // Manual retry — call from UI when tokenExchangeError is non-null.
    // Re-runs the exchange with the current Firebase user and a fresh token.
    async function retryTokenExchange() {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        setTokenExchangeError(null);
        try {
            await runTokenExchange(currentUser);
        } catch (err) {
            const exchangeErr = err instanceof ExchangeTokenError
                ? err
                : new ExchangeTokenError("unknown", "Token exchange failed.");
            setTokenExchangeError(exchangeErr);
            throw exchangeErr; // re-throw so callers can react
        }
    }

    async function sendVerifyEmail() {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        await sendEmailVerification(currentUser);
    }

    async function sendVerifyPhone() {

    }

    return (
        <AuthContext.Provider value={{
            user, loading, 
            tokenExchangeError,retryTokenExchange,
            sendVerifyEmail
        }}>
            {children}
        </AuthContext.Provider>
    );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used inside AuthProvider");
    return context;
}