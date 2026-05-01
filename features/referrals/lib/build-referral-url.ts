import { env } from "@/data/env/client";
import { STAFF_ROLE, OPERATOR_ROLE } from "@/features/auth/types";

export type ReferralRoleHint = typeof STAFF_ROLE | typeof OPERATOR_ROLE;

/**
 * Canonical share URL for a referral code.
 *
 * Optional `as` hint forwards a role through to the sign-up form when the
 * referrer cannot determine the role on their own (e.g. an admin invite that
 * targets a specific account type).
 *
 * Always uses the public app URL — never relies on `window.location` so the
 * value is identical on the server (emails) and the client (copy-to-clipboard).
 */
export function buildReferralUrl(
  code: string,
  opts: { as?: ReferralRoleHint } = {},
): string {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  const url = `${base}/refer/${code}`;
  return opts.as ? `${url}?as=${opts.as}` : url;
}
