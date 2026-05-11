/**
 * Allowed targets for `signInReturn` on auth flows (forgot password → back to sign-in).
 * Restrict to known routes — never pass through arbitrary open redirects.
 */
const ALLOWED_SIGN_IN_RETURN_PATHS = new Set([
    "/sign-in",
    "/sign-in/staff",
    "/sign-in/operator",
    "/sign-in/candidate",
]);

/**
 * Returns a safe path for navigation, or null if the value is missing or not allowlisted.
 */
export function safeSignInReturnPath(
    raw: string | null | undefined,
): string | null {
    if (raw == null || raw === "") return null;
    const trimmed = raw.trim();
    if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
    if (trimmed.includes("?") || trimmed.includes("#")) return null;
    if (!ALLOWED_SIGN_IN_RETURN_PATHS.has(trimmed)) return null;
    return trimmed;
}
