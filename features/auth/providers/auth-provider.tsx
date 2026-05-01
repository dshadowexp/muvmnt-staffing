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
import { ADMIN_ROLE, CANDIDATE_ROLE, OPERATOR_ROLE, STAFF_ROLE, UserAuth, UserRole } from "@/features/auth/types";
import { useRouter } from "@/i18n/navigation";
import { logout } from "@/services/firebase/auth";
import { recordReferralAction } from "@/features/referrals/actions";
import { deregisterPushTokenAction } from "@/features/notifications/actions";
import { exchangeFirebaseUser } from "../actions";

const OPERATOR_LS_FIRST_NAME = "readykare_operator_first_name";
const OPERATOR_LS_LAST_NAME = "readykare_operator_last_name";

function peekOperatorSignupNames(): { firstName: string; lastName: string } | null {
    if (typeof window === "undefined") return null;
    const f = localStorage.getItem(OPERATOR_LS_FIRST_NAME)?.trim();
    const l = localStorage.getItem(OPERATOR_LS_LAST_NAME)?.trim();
    if (!f || !l) return null;
    return { firstName: f, lastName: l };
}
import posthog from "posthog-js";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { INACTIVE_PREFIXES } from "@/lib/constants";

// ─── Helpers (mirror middleware path-prefix logic; pathname is locale-stripped) ─

function pathHasPrefix(pathname: string, prefix: string): boolean {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Routes where post–sign-in redirect to the app root is expected (not deep links). */
function isAuthEntryPath(pathname: string): boolean {
    if (pathname === "/") return true;
    return (
        pathHasPrefix(pathname, "/sign-in") ||
        pathHasPrefix(pathname, "/sign-up") ||
        pathHasPrefix(pathname, "/forgot-password")
    );
}

function isInactiveAllowedPath(pathname: string): boolean {
    return INACTIVE_PREFIXES.some((p) => pathHasPrefix(pathname, p));
}

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthContextType = {
  firebaseUser: User | null;
  authUser: UserAuth | null;
  loading: boolean;
  setPendingRole: (role: UserRole | null) => void;
  setPendingReferralCode: (code: string | null) => void;
  /** Facility team invite token from `/join/team/...` → sign-up/sign-in (cleared after exchange). */
  setPendingInviteToken: (token: string | null) => void;
  reloadToken: () => Promise<void>;
  /** Register a handler that fires instead of navigating when a Firebase user
   *  has no Supabase row (not_found). Call with null to unregister. */
  setNotFoundHandler: (fn: (() => void) | null) => void;
  /** Register a handler that fires instead of navigating on email_taken. */
  setEmailTakenHandler: (fn: (() => void) | null) => void;
  /** Register a handler that fires instead of the provider navigating on
   *  successful sign-in (e.g. portal contexts that manage their own refresh). */
  setSuccessHandler: (fn: ((user: UserAuth) => void) | null) => void;
  reloadFirebaseUser: () => Promise<void>;
};

type ExchangeOutcome =
  | { status: "ok"; user: UserAuth }
  | "not_found"
  | "email_taken"
  | "personal_email"
  | "invite_not_found"
  | "facility_invite_conflict";

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const pathnameRef = useRef(pathname);
    pathnameRef.current = pathname;
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [authUser, setAuthUser] = useState<UserAuth | null>(null);
    const [loading, setLoading] = useState(true);
    const pendingRoleRef = useRef<UserRole | null>(null);
    const pendingReferralCodeRef = useRef<string | null>(null);
    const pendingInviteTokenRef = useRef<string | null>(null);
    const onNotFoundRef = useRef<(() => void) | null>(null);
    const onEmailTakenRef = useRef<(() => void) | null>(null);
    const onSuccessRef = useRef<((user: UserAuth) => void) | null>(null);

    const setPendingRole = useCallback((role: UserRole | null) => {
        pendingRoleRef.current = role;
    }, []);

    const setPendingReferralCode = useCallback((code: string | null) => {
        pendingReferralCodeRef.current = code;
    }, []);

    const setPendingInviteToken = useCallback((token: string | null) => {
        pendingInviteTokenRef.current = token?.trim() || null;
    }, []);

    const setNotFoundHandler = useCallback((fn: (() => void) | null) => {
        onNotFoundRef.current = fn;
    }, []);

    const setEmailTakenHandler = useCallback((fn: (() => void) | null) => {
        onEmailTakenRef.current = fn;
    }, []);

    const setSuccessHandler = useCallback((fn: ((user: UserAuth) => void) | null) => {
        onSuccessRef.current = fn;
    }, []);

    async function reloadFirebaseUser() {
        if (!firebaseUser) return;
        await firebaseUser.reload();
        // After reload, the firebaseUser object is mutated in place by Firebase SDK
        // Force a re-render by re-setting it
        const refreshed = auth.currentUser;
        setFirebaseUser(refreshed);
    }

    /**
     * Exchanges a Firebase user for a Supabase-backed UserAuth session.
     *
     * Returns a typed outcome string — throws only on real server errors
     * (status "error") after surfacing a toast, so the caller can treat
     * throw as "unrecoverable, clean up and stop".
     */
    async function runTokenExchange(user: User): Promise<ExchangeOutcome> {
        const inviteToken =
            pendingInviteTokenRef.current ?? searchParams.get("invite_token");

        const operatorSignupNames =
            pendingRoleRef.current === OPERATOR_ROLE ? peekOperatorSignupNames() : null;

        const result = await exchangeFirebaseUser({
            authId: user.uid,
            email: user.email ?? "",
            emailVerified: user.emailVerified ?? false,
            role: pendingRoleRef.current ?? undefined,
            inviteToken: inviteToken ?? undefined,
            operatorSignupNames,
        });

        if (result.status === "not_found") return "not_found";
        if (result.status === "email_taken") return "email_taken";
        if (result.status === "personal_email") return "personal_email";
        if (result.status === "invite_not_found") return "invite_not_found";
        if (result.status === "facility_invite_conflict") {
            toast.error(result.message);
            pendingInviteTokenRef.current = null;
            return "facility_invite_conflict";
        }

        if (result.status === "error") {
            toast.error(`Sign in failed: ${result.message}`);
            throw new Error(result.message);
        }

        // status === "ok" — persist session and update state
        setAuthUser(result.user);
        await setSession(result.user);

        if (
            result.user.role === OPERATOR_ROLE &&
            typeof window !== "undefined"
        ) {
            localStorage.removeItem(OPERATOR_LS_FIRST_NAME);
            localStorage.removeItem(OPERATOR_LS_LAST_NAME);
        }

        // Capture and clear pending refs before any async work
        const pendingReferral = pendingReferralCodeRef.current;
        const pendingRole = pendingRoleRef.current;
        pendingRoleRef.current = null;
        pendingReferralCodeRef.current = null;
        pendingInviteTokenRef.current = null;

        // Fire-and-forget — non-fatal
        if (pendingReferral && pendingRole) {
            recordReferralAction().then(({ success }) => {
                if (success) toast.success("Referral recorded successfully");
                else toast.error("Failed to record referral");
            });
        }

        return { status: "ok", user: result.user };
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
                        searchParams.get("redirect") ?? searchParams.get("ref") ?? searchParams.get("as") ?? searchParams.get("token");
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

                if (outcome === "personal_email") {
                    await logout();
                    await deleteSession();
                    toast.error(
                        "Please sign up with your company or organization email — personal addresses like Gmail or Outlook are not accepted.",
                    );
                    return;
                }

                if (outcome === "invite_not_found") {
                    await logout();
                    await deleteSession();
                    toast.error(
                        "No screening invite was found for this email address. Please use the email address your invite was sent to.",
                    );
                    return;
                }

                if (outcome === "facility_invite_conflict") {
                    await logout();
                    await deleteSession();
                    setFirebaseUser(null);
                    setAuthUser(null);
                    return;
                }

                // outcome.status === "ok" — session cookie is already set
                posthog.identify(user.email ?? user.uid, {
                    email: user.email ?? undefined,
                });
                setFirebaseUser(user);

                // Navigate now that setSession has completed. If a handler is
                // registered (e.g. portal), defer to it instead of navigating.
                if (onSuccessRef.current) {
                    onSuccessRef.current(outcome.user);
                } else {
                    const path = pathnameRef.current;

                    if (
                        !outcome.user.isActive &&
                        outcome.user.role !== CANDIDATE_ROLE
                    ) {
                        if (!isInactiveAllowedPath(path)) {
                            router.replace("/review" as Parameters<typeof router.replace>[0]);
                        }
                    } else if (isAuthEntryPath(path)) {
                        const redirectParam =
                            searchParams.get("redirect") ??
                            searchParams.get("callbackUrl");
                        const safeParam =
                            redirectParam &&
                            redirectParam.startsWith("/") &&
                            !redirectParam.startsWith("//")
                                ? redirectParam
                                : null;
                        let dest = "/";
                        if (outcome.user.role === ADMIN_ROLE) dest = "/admin";
                        if (outcome.user.role === STAFF_ROLE) dest = "/staff";
                        if (outcome.user.role === OPERATOR_ROLE)
                            dest = outcome.user.facilityId ? "/app" : "/onboarding";
                        if (outcome.user.role === CANDIDATE_ROLE) dest = "/s";
                        const target = safeParam ?? dest;
                        const normalized =
                            outcome.user.role === OPERATOR_ROLE &&
                            !outcome.user.facilityId &&
                            (target === "/app" || target.startsWith("/app/"))
                                ? "/onboarding"
                                : target;
                        router.push(normalized as Parameters<typeof router.push>[0]);
                    }
                    // Else: session restored on an in-app or marketing URL — keep current route (reload / deep link).
                }
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
                setPendingInviteToken,
                reloadToken,
                setNotFoundHandler,
                setEmailTakenHandler,
                setSuccessHandler,
                reloadFirebaseUser,
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