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

/** Firebase codes where we intentionally show no toast/banner (benign cancel). */
const AUTH_ERROR_SILENT = new Set<string>([
    "auth/cancelled-popup-request",
    "auth/popup-closed-by-user",
]);

/**
 * User-facing Firebase Auth codes only (email/password, OAuth popups, phone/SMS,
 * MFA messages, quotas, browser limits). Config/admin/internal codes fall through
 * to `"generic"`.
 *
 * Returns a translation key under `auth.errors`, `""` for silent codes, or
 * `"generic"` when unknown.
 */
export function getAuthErrorKey(error: unknown): string {
    const code = (error as AuthError)?.code ?? "";
    if (AUTH_ERROR_SILENT.has(code)) return "";

    const map: Record<string, string> = {
        "auth/account-exists-with-different-credential":
            "accountExistsDifferentCredential",
        "auth/captcha-check-failed": "captchaCheckFailed",
        "auth/code-expired": "codeExpired",
        "auth/credential-already-in-use": "credentialAlreadyInUse",
        "auth/email-already-in-use": "emailInUse",
        "auth/email-change-needs-verification": "emailChangeNeedsVerification",
        "auth/expired-action-code": "expiredActionCode",
        "auth/invalid-action-code": "invalidActionCode",
        "auth/invalid-app-credential": "invalidAppCredential",
        "auth/invalid-credential": "invalidCredential",
        "auth/invalid-login-credentials": "invalidCredentials",
        "auth/invalid-email": "invalidEmail",
        "auth/invalid-phone-number": "invalidPhoneNumber",
        "auth/invalid-verification-code": "invalidVerificationCode",
        "auth/invalid-verification-id": "invalidVerificationId",
        "auth/missing-app-credential": "missingAppCredential",
        "auth/missing-email": "invalidEmail",
        "auth/missing-phone-number": "missingPhoneNumber",
        "auth/missing-verification-code": "missingVerificationCode",
        "auth/missing-verification-id": "missingVerificationId",
        "auth/multi-factor-auth-required": "mfaRequired",
        "auth/multi-factor-info-not-found": "mfaInfoNotFound",
        "auth/network-request-failed": "networkRequest",
        "auth/no-such-provider": "noSuchProvider",
        "auth/operation-not-allowed": "operationNotAllowed",
        "auth/operation-not-supported-in-this-environment": "envNotSupported",
        "auth/popup-blocked": "popupBlocked",
        "auth/provider-already-linked": "providerAlreadyLinked",
        "auth/quota-exceeded": "quotaExceeded",
        "auth/redirect-cancelled-by-user": "redirectCancelledByUser",
        "auth/redirect-operation-pending": "redirectPending",
        "auth/rejected-credential": "invalidCredential",
        "auth/requires-recent-login": "requiresRecentLogin",
        "auth/second-factor-already-in-use": "secondFactorAlreadyInUse",
        "auth/maximum-second-factor-count-exceeded": "maxSecondFactorsExceeded",
        "auth/timeout": "timeout",
        "auth/too-many-requests": "tooManyRequests",
        "auth/unverified-email": "unverifiedEmail",
        "auth/user-cancelled": "userCancelled",
        "auth/user-disabled": "userDisabled",
        "auth/user-mismatch": "userMismatch",
        "auth/user-not-found": "userNotFound",
        "auth/user-token-expired": "userTokenExpired",
        "auth/weak-password": "weakPassword",
        "auth/wrong-password": "wrongPassword",
        "auth/cors-unsupported": "browserNotSupportedCors",
        "auth/web-storage-unsupported": "browserNotSupportedStorage",
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
