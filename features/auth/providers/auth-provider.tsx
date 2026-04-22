"use client";

import {
    type User,
    onAuthStateChanged,
} from "firebase/auth";
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
import { UserAuth, UserRole } from "@/types/auth";
import { useRouter } from "@/i18n/navigation";
import { logout } from "@/services/firebase/auth";
import { recordReferralAction } from "@/features/referrals/actions";
import { deregisterPushTokenAction } from "@/features/notifications/actions";
import { exchangeFirebaseUser } from "../actions";
import posthog from "posthog-js";
import { toast } from "sonner";

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
    const router = useRouter();
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
        const authUser = await exchangeFirebaseUser({
            authId: firebaseUser.uid,
            email: firebaseUser.email ?? "",
            emailVerified: firebaseUser.emailVerified ?? false,
            role: pendingRoleRef.current ?? undefined,
        });
       
        setAuthUser(authUser);
        await setSession(authUser);
        pendingRoleRef.current = null;

        if (pendingReferralCodeRef.current && pendingRoleRef.current) { 
            recordReferralAction().then(({ success, error }) => {
                if (success) {
                    toast.success("Referral recorded successfully");
                } else {
                    toast.error("Failed to record referral");
                }
            })
            pendingReferralCodeRef.current = null;
        }
    }

    async function clearAuth() {
        await deregisterPushTokenAction().catch(console.error);
        await deleteSession();
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
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setLoading(true);

            if (!firebaseUser) {
                await clearAuth();
                setLoading(false);
                return;
            }

            try {
                await runTokenExchange(firebaseUser);
            } catch (err) {
                toast.error("First sign up to create your account");
                await clearAuth();
                await logout();
                router.push("/sign-up"); // TODO: redirect to sign-up with the role
                return;
            }

            posthog.identify(firebaseUser.email ?? firebaseUser.uid, { email: firebaseUser.email ?? undefined });
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