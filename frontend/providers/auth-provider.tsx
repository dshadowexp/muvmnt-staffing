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
import { exchangeToken, ExchangeTokenError } from "@/features/auth/api";
import { deleteSession, setSession } from "@/lib/session";
import { UserAuth, UserRole } from "@/types/auth";
import { setCookie, deleteCookie } from "cookies-next";
import { redirect } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { logout } from "@/services/firebase/auth";

// ─── Types ────────────────────────────────────────────────────────────────────
type AuthContextType = {
    firebaseUser:               User | null;
    authUser:           UserAuth | null;
    loading:            boolean;
    setPendingRole:     (role: UserRole | null) => void;
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

    const setPendingRole = useCallback((role: UserRole | null) => {
        pendingRoleRef.current = role;
    }, []);


    async function runTokenExchange(firebaseUser: User) {
        const firebaseToken = await firebaseUser.getIdToken();

        const authUser = await exchangeToken(
            firebaseToken,
            pendingRoleRef.current ?? undefined,
            () => firebaseUser.getIdToken(true),
        );

        setAuthUser(authUser);
        pendingRoleRef.current = null;
        await setSession(authUser);
        await setCookie("__session", firebaseToken);
    }

    async function clearAuth() {
        await deleteSession();
        await deleteCookie("__session");
        setFirebaseUser(null);
        setAuthUser(null);
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
                console.error(err);
                if (err instanceof ExchangeTokenError) {
                    if (err.kind === "not_found") {
                        await clearAuth();
                        await logout();
                        redirect({ href: "/sign-up", locale });
                        return;
                    }
                }
            }

            setFirebaseUser(firebaseUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{
            firebaseUser, authUser, loading, setPendingRole,
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