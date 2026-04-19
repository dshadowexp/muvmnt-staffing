import { 
    AuthError, GoogleAuthProvider, 
    sendPasswordResetEmail, signInWithEmailAndPassword, 
    signInWithPopup, signOut as firebaseSignOut,
    createUserWithEmailAndPassword, 
} from "firebase/auth";
import { auth } from "./client";

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
    };
    return map[code] ?? "generic";
}

/** Backwards-compatible label helper (English only) — prefer translating via `getAuthErrorKey`. */
export function getAuthErrorMessage(error: unknown): string {
    const key = getAuthErrorKey(error);
    if (!key) return "";
    const fallbacks: Record<string, string> = {
        emailInUse:          "An account with this email already exists.",
        invalidCredentials:  "Invalid email or password.",
        weakPassword:        "Password must be at least 6 characters.",
        userNotFound:        "No account found with this email.",
        tooManyRequests:     "Too many attempts. Please try again later.",
        networkRequest:      "Network error. Please check your connection.",
        generic:             "Something went wrong. Please try again.",
    };
    return fallbacks[key] ?? fallbacks.generic;
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

export async function logout() {
    await firebaseSignOut(auth);
}
