import { 
    AuthError, GoogleAuthProvider, 
    sendPasswordResetEmail, signInWithEmailAndPassword, 
    signInWithPopup, signOut as firebaseSignOut,
    createUserWithEmailAndPassword, 
} from "firebase/auth";
import { auth } from "./client";

// ─── Error messages ───────────────────────────────────────────────────────────

export function getAuthErrorMessage(error: unknown): string {
    const code = (error as AuthError)?.code ?? "";
    const map: Record<string, string> = {
        "auth/email-already-in-use":    "An account with this email already exists. Try signing in instead.",
        "auth/invalid-email":           "Please enter a valid email address.",
        "auth/weak-password":           "Password must be at least 6 characters.",
        "auth/user-not-found":          "No account found with this email. Try signing up.",
        "auth/wrong-password":          "Incorrect password. Please try again.",
        "auth/invalid-credential":      "Incorrect email or password. Please try again.",
        "auth/too-many-requests":       "Too many failed attempts. Please wait a moment and try again.",
        "auth/popup-closed-by-user":    "Sign-in window was closed. Please try again.",
        "auth/cancelled-popup-request": "",
        "auth/network-request-failed":  "Network error. Please check your connection.",
        "auth/missing-email":           "Please enter your email address.",
    };
    return map[code] ?? "Something went wrong. Please try again.";
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

