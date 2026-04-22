import { 
    AuthError, GoogleAuthProvider, 
    sendPasswordResetEmail, signInWithEmailAndPassword, 
    signInWithPopup, signOut as firebaseSignOut,
    createUserWithEmailAndPassword,
    signInAnonymously,
    getAuth, 
} from "firebase/auth";
import { firebaseApp } from "./client";

export const auth = getAuth(firebaseApp);
auth.useDeviceLanguage();

// ─── Error mapping ────────────────────────────────────────────────────────────

/**
 * Translation key (under `auth.errors`) for a known Firebase auth code, or
 * `"generic"` when no specific mapping exists. The empty string is returned
 * for user-cancelled popup requests so callers can skip notifying the user.
 */
export function getAuthErrorKey(error: unknown): string {
    const code = (error as AuthError)?.code ?? "";
    const map: Record<string, string> = {
        "auth/email-already-in-use":    "emailInUse",
        "auth/invalid-email":           "invalidCredentials",
        "auth/weak-password":           "weakPassword",
        "auth/user-not-found":          "userNotFound",
        "auth/wrong-password":          "invalidCredentials",
        "auth/invalid-credential":      "invalidCredentials",
        "auth/too-many-requests":       "tooManyRequests",
        "auth/network-request-failed":  "networkRequest",
        "auth/missing-email":           "invalidCredentials",
        "auth/cancelled-popup-request": "",
        "auth/popup-closed-by-user":    "",
        "auth/invalid-verification-code": "",
    };
    return map[code] ?? "generic";
}

// ── Auth actions ──────────────────────────────────────────────────────────

export async function loginWithEmail(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
    await createUserWithEmailAndPassword(auth, email, password);
}

export async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
}

export async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
        prompt: "select_account",
    });
    await signInWithPopup(auth, provider);
}

export async function signInAsAnonymously() {
    await signInAnonymously(auth);
}

export async function logout() {
    await firebaseSignOut(auth);
}
