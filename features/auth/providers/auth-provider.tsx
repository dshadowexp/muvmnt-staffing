"use client";

import {
    type User,
    onIdTokenChanged,
} from "firebase/auth";
import React, { 
    createContext, 
    useCallback, 
    useContext, 
    useEffect, 
    useRef, 
    useState,
} from "react";
import { auth } from "@/services/firebase/client";
import { deleteSession, setSession } from "@/lib/session";
import { UserAuth, UserRole } from "@/types/auth";
import { setCookie, deleteCookie } from "cookies-next";
import { redirect } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { logout } from "@/services/firebase/auth";
import { recordReferralAction } from "@/features/referrals/actions";
import { deregisterPushTokenAction } from "@/features/notifications/actions";
import { exchangeFirebaseUser } from "../actions";
import posthog from "posthog-js";

// ─── Types ────────────────────────────────────────────────────────────────────
type AuthContextType = {
    firebaseUser:               User | null;
    authUser:           UserAuth | null;
    loading:            boolean;
    setPendingRole:     (role: UserRole | null) => void;
    setPendingReferralCode: (code: string | null) => void;
    reloadToken: () => Promise<void>;
};

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const locale = useLocale();
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [authUser, setAuthUser] = useState<UserAuth | null>(null);
    const [loading, setLoading] = useState(true);
    const pendingRoleRef = useRef<UserRole | null>(null);
    const pendingReferralCodeRef = useRef<string | null>(null);

    const setPendingRole = useCallback((role: UserRole | null) => {
        pendingRoleRef.current = role;
    }, []);

    const setPendingReferralCode = useCallback((code: string | null) => {
        pendingReferralCodeRef.current = code;
    }, []);


    async function runTokenExchange(firebaseUser: User) {
        const firebaseToken = await firebaseUser.getIdToken();

        const authUser = await exchangeFirebaseUser({
            authId: firebaseUser.uid,
            email: firebaseUser.email ?? "",
            emailVerified: firebaseUser.emailVerified ?? false,
            role: pendingRoleRef.current ?? undefined,
        });

        const hadReferral = pendingReferralCodeRef.current !== null;
        pendingRoleRef.current = null;
        pendingReferralCodeRef.current = null;
        setAuthUser(authUser);
        await setSession(authUser);
        await setCookie("__session", firebaseToken);

        if (hadReferral) {
            recordReferralAction().catch(console.error);
        }
    }

    async function clearAuth() {
        await deregisterPushTokenAction().catch(console.error);
        await deleteSession();
        await deleteCookie("__session");
        setFirebaseUser(null);
        setAuthUser(null);
        setLoading(false);
    }

    async function reloadToken() {
        if (!firebaseUser) return;
        setLoading(true);
        await runTokenExchange(firebaseUser);
        setLoading(false);  
    }

    useEffect(() => {
        const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
            setLoading(true);

            if (!firebaseUser) {
                await clearAuth();
                return;
            }

            try {
                await runTokenExchange(firebaseUser);
            } catch (err) {
                await clearAuth();
                await logout();
                redirect({ href: "/sign-up", locale });
                return;
            }

            posthog.identify(firebaseUser.email ?? undefined, { email: firebaseUser.email ?? undefined });
            setFirebaseUser(firebaseUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{
            firebaseUser, authUser, loading, setPendingRole, setPendingReferralCode, reloadToken,
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