import {
    AuthError, GoogleAuthProvider,
    sendPasswordResetEmail, signInWithEmailAndPassword,
    signInWithPopup, signOut as firebaseSignOut,
    createUserWithEmailAndPassword,
    updateProfile,
    signInAnonymously,
    signInWithCustomToken as firebaseSignInWithCustomToken,
    getAuth,
    OAuthProvider,
    sendSignInLinkToEmail,
    isSignInWithEmailLink as firebaseIsSignInWithEmailLink,
    signInWithEmailLink as firebaseSignInWithEmailLink,
    type ActionCodeSettings,
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

export async function signUpWithEmail(
    email: string,
    password: string,
    displayName?: string,
) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
        await updateProfile(cred.user, { displayName });
    }
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

export async function loginWithMicrosoft() {
    const provider = new OAuthProvider("microsoft.com");
    provider.setCustomParameters({
        prompt: "select_account",
    });
    await signInWithPopup(auth, provider);
}

export async function signInAsAnonymously() {
    await signInAnonymously(auth);
}

// ─── Email link (magic link / passwordless) ───────────────────────────────────

/** localStorage keys used during the email-link sign-in flow. */
export const EMAIL_LINK_LS_EMAIL = "readykare_email_link_email";
export const EMAIL_LINK_LS_NAME  = "readykare_email_link_display_name";

/**
 * Sends a Firebase email sign-in link to `email`.
 * `continueUrl` must be the full URL the user lands on after clicking the link.
 */
export async function sendMagicLink(
    email: string,
    continueUrl: string,
): Promise<void> {
    const settings: ActionCodeSettings = {
        url: continueUrl,
        handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, settings);
}

/** Returns true when the current browser URL is a valid Firebase email sign-in link. */
export function isEmailSignInLink(url: string): boolean {
    return firebaseIsSignInWithEmailLink(auth, url);
}

/**
 * Completes sign-in with the email link in the current URL.
 * Optionally sets the Firebase user's displayName immediately after sign-in.
 */
export async function signInWithMagicLink(
    email: string,
    displayName?: string,
): Promise<void> {
    const cred = await firebaseSignInWithEmailLink(auth, email, window.location.href);
    if (displayName) {
        await updateProfile(cred.user, { displayName });
    }
}

/**
 * Signs the client in using a Firebase custom token generated server-side.
 * Used for candidate magic-link auth: the server creates a short-lived token
 * tied to the candidate's email so they don't need a password.
 */
export async function signInWithCustomToken(token: string): Promise<void> {
    await firebaseSignInWithCustomToken(auth, token);
}

export async function logout() {
    await firebaseSignOut(auth);
}
