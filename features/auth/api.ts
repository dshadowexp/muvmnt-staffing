import { UserRole } from "@/types/auth";
import { setSession } from "../../lib/session";
import { env } from "@/data/env/client";

export interface ExchangeTokenResponse {
    userId: string;
    token: string;
    role:  UserRole;
    isActive: boolean;
}

// ─── Typed error ──────────────────────────────────────────────────────────────

export type ExchangeErrorKind =
    | "unauthorized"   // 401 — Firebase token rejected by backend
    | "bad_request"    // 400 — invalid role or malformed body (logic bug)
    | "server_error"   // 5xx — backend down / transient
    | "network"        // fetch threw — offline or DNS failure
    | "not_found"      // 404 — user not found
    | "unknown";

export class ExchangeTokenError extends Error {
    constructor(
        public readonly kind: ExchangeErrorKind,
        message: string,
        public readonly status?: number,
    ) {
        super(message);
        this.name = "ExchangeTokenError";
    }

    get retryable(): boolean {
        return this.kind === "server_error" || this.kind === "network";
    }
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

async function fetchExchange(
    firebaseToken: string,
    role?: UserRole,
): Promise<ExchangeTokenResponse> {
    let res: Response;

    try {
        res = await fetch(
            `${env.NEXT_PUBLIC_APP_URL}/api/v1/auth/exchange-token`,
            {
                method:  "POST",
                headers: {
                    "Authorization": `Bearer ${firebaseToken}`,
                    "Content-Type":  "application/json",
                },
                body: JSON.stringify(role ? { role } : {}),
            },
        );
    } catch {
        throw new ExchangeTokenError("network", "Network request failed — check your connection.");
    }

    const body = await res.json().catch(() => null);

    if (res.ok) {
        await setSession(body);
        return body;
    };

    const msg  = body?.message ?? `Token exchange failed (${res.status})`;

    if (res.status === 401) throw new ExchangeTokenError("unauthorized", msg, 401);
    if (res.status === 400) throw new ExchangeTokenError("bad_request",  msg, 400);
    if (res.status >= 500)  throw new ExchangeTokenError("server_error", msg, res.status);
    if (res.status === 404) throw new ExchangeTokenError("not_found", msg, 404);

    throw new ExchangeTokenError("unknown", msg, res.status);
}

// ─── Retry helper ─────────────────────────────────────────────────────────────

function delay(ms: number) {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Exchange a Firebase ID token for an internal Fastify JWT.
 *
 * Retry policy:
 *   - network / 5xx  → up to 3 attempts with 800ms → 1600ms backoff
 *   - 401            → force-refresh the Firebase token, retry ONCE
 *   - 400            → not retried (logic error, throw immediately)
 *
 * @param firebaseToken  Fresh Firebase ID token from getIdToken()
 * @param role           Only required on the very first sign-up
 * @param getTokenFresh  Callback to force-refresh the Firebase token on 401
 */
export async function exchangeToken(
    firebaseToken: string,
    role?:         UserRole,
    getTokenFresh?: () => Promise<string>,
): Promise<ExchangeTokenResponse> {
    const MAX_RETRIES    = 3;
    const BACKOFF_BASE   = 800; // ms

    let lastError: ExchangeTokenError | undefined;
    let token = firebaseToken;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            return await fetchExchange(token, role);

        } catch (err) {
            if (!(err instanceof ExchangeTokenError)) throw err;
            lastError = err;

            // 401: Firebase token rejected — force-refresh once then retry
            if (err.kind === "unauthorized" && attempt === 0 && getTokenFresh) {
                try {
                    token = await getTokenFresh();
                    continue; // retry immediately with fresh token, no backoff
                } catch {
                    // If the refresh itself fails, fall through and throw
                    break;
                }
            }

            // 400: logic error, don't retry
            if (err.kind === "bad_request") break;

            // 404: user not found, don't retry
            if (err.kind === "not_found") break;

            // network / 5xx: wait and retry
            if (err.retryable && attempt < MAX_RETRIES - 1) {
                await delay(BACKOFF_BASE * Math.pow(2, attempt)); // 800ms, 1600ms
                continue;
            }

            break;
        }
    }

    throw lastError ?? new ExchangeTokenError("unknown", "Token exchange failed.");
}

