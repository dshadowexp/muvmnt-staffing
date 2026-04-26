"use client";

import { type User, onAuthStateChanged } from "firebase/auth";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { auth } from "@/services/firebase/auth";
import { deleteSession, setSession } from "@/lib/session";
import { UserAuth, UserRole } from "@/features/auth/types";
import { useRouter } from "@/i18n/navigation";
import { logout } from "@/services/firebase/auth";
import { recordReferralAction } from "@/features/referrals/actions";
import { deregisterPushTokenAction } from "@/features/notifications/actions";
import { exchangeFirebaseUser } from "../actions";
import posthog from "posthog-js";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthContextType = {
  firebaseUser: User | null;
  authUser: UserAuth | null;
  loading: boolean;
  setPendingRole: (role: UserRole | null) => void;
  setPendingReferralCode: (code: string | null) => void;
  reloadToken: () => Promise<void>;
  /** Register a handler that fires instead of navigating when a Firebase user
   *  has no Supabase row (not_found). Call with null to unregister. */
  setNotFoundHandler: (fn: (() => void) | null) => void;
  /** Register a handler that fires instead of navigating on email_taken. */
  setEmailTakenHandler: (fn: (() => void) | null) => void;
};

type ExchangeOutcome = "ok" | "not_found" | "email_taken";

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [authUser, setAuthUser] = useState<UserAuth | null>(null);
    const [loading, setLoading] = useState(true);
    const pendingRoleRef = useRef<UserRole | null>(null);
    const pendingReferralCodeRef = useRef<string | null>(null);
    const onNotFoundRef = useRef<(() => void) | null>(null);
    const onEmailTakenRef = useRef<(() => void) | null>(null);

    const setPendingRole = useCallback((role: UserRole | null) => {
        pendingRoleRef.current = role;
    }, []);

    const setPendingReferralCode = useCallback((code: string | null) => {
        pendingReferralCodeRef.current = code;
    }, []);

    const setNotFoundHandler = useCallback((fn: (() => void) | null) => {
        onNotFoundRef.current = fn;
    }, []);

    const setEmailTakenHandler = useCallback((fn: (() => void) | null) => {
        onEmailTakenRef.current = fn;
    }, []);

    /**
     * Exchanges a Firebase user for a Supabase-backed UserAuth session.
     *
     * Returns a typed outcome string — throws only on real server errors
     * (status "error") after surfacing a toast, so the caller can treat
     * throw as "unrecoverable, clean up and stop".
     */
    async function runTokenExchange(user: User): Promise<ExchangeOutcome> {
        const result = await exchangeFirebaseUser({
            authId: user.uid,
            email: user.email ?? "",
            emailVerified: user.emailVerified ?? false,
            role: pendingRoleRef.current ?? undefined,
        });

        if (result.status === "not_found") return "not_found";
        if (result.status === "email_taken") return "email_taken";

        if (result.status === "error") {
            toast.error(`Sign in failed: ${result.message}`);
            throw new Error(result.message);
        }

        // status === "ok" — persist session and update state
        setAuthUser(result.user);
        await setSession(result.user);

        // Capture and clear pending refs before any async work
        const pendingReferral = pendingReferralCodeRef.current;
        const pendingRole = pendingRoleRef.current;
        pendingRoleRef.current = null;
        pendingReferralCodeRef.current = null;

        // Fire-and-forget — non-fatal
        if (pendingReferral && pendingRole) {
            recordReferralAction().then(({ success }) => {
                if (success) toast.success("Referral recorded successfully");
                else toast.error("Failed to record referral");
            });
        }

        return "ok";
    }

    async function clearAuth() {
        await deregisterPushTokenAction().catch(console.error);
        await deleteSession();
        setFirebaseUser(null);
        setAuthUser(null);
    }

    async function reloadToken() {
        if (!firebaseUser) return;
        setLoading(true);
        try {
            await runTokenExchange(firebaseUser);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setLoading(true);

            if (!user) {
                await clearAuth();
                setLoading(false);
                return;
            }

            try {
                const outcome = await runTokenExchange(user);

                if (outcome === "not_found") {
                    // Firebase account exists but no Supabase row — needs to sign up.
                    // If a portal has registered a handler, defer to it instead of
                    // navigating away (which would unmount the portal).
                    await logout();
                    await deleteSession();
                    toast.info("No account found. Please sign up to get started.");
                    if (onNotFoundRef.current) {
                        onNotFoundRef.current();
                        return;
                    }
                    const redirectParam =
                        searchParams.get("redirect") ?? searchParams.get("callbackUrl");
                    router.push(
                        redirectParam
                        ? `/sign-up?redirect=${encodeURIComponent(redirectParam)}`
                        : "/sign-up",
                    );
                    return;
                }

                if (outcome === "email_taken") {
                    // Email is registered under a different auth provider.
                    await logout();
                    await deleteSession();
                    toast.error(
                        "An account with this email already exists. Please sign in instead.",
                    );
                    if (onEmailTakenRef.current) {
                        onEmailTakenRef.current();
                        return;
                    }
                    router.push("/sign-in");
                    return;
                }

                // outcome === "ok"
                posthog.identify(user.email ?? user.uid, {
                    email: user.email ?? undefined,
                });
                setFirebaseUser(user);
            } catch {
                // runTokenExchange already surfaced a toast for the specific error.
                // Clean up so the user isn't stuck in a broken session.
                await logout();
                await deleteSession();
                setFirebaseUser(null);
                setAuthUser(null);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider
            value={{
                firebaseUser,
                authUser,
                loading,
                setPendingRole,
                setPendingReferralCode,
                reloadToken,
                setNotFoundHandler,
                setEmailTakenHandler,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}