"use server";

import { cookies } from "next/headers";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/services/supabase/server";
import type { Locale } from "next-intl";

const REFERRAL_CODE_LENGTH = 8;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const COOKIE_NAME = "referral_code";

function normalizeCode(raw: string): string | null {
  const normalized = raw.toUpperCase().trim();
  if (
    normalized.length !== REFERRAL_CODE_LENGTH ||
    !/^[A-Z0-9]+$/.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

function asRoleHint(value: string | undefined | null): "worker" | "client" | null {
  return value === "worker" || value === "client" ? value : null;
}

/**
 * Resolves a referral link:
 *  - Already signed in + self-referral → back to dashboard with `ref_error=self`.
 *  - Already signed in + someone else's code → back to dashboard with `ref_notice=already_member`.
 *  - Anonymous + invalid code → `/sign-up?ref_error=invalid|not_found`.
 *  - Anonymous + valid code → set `referral_code` cookie, go to
 *    `/sign-up?ref=CODE&as=<role>` so the sign-up form preselects the correct
 *    account type. The role is taken from the explicit `as` argument first
 *    (used for admin-issued invites that target a specific role), falling
 *    back to the referrer's own role.
 */
export async function claimReferralCode(
  rawCode: string,
  locale: Locale,
  asOverride?: string | null,
) {
  const session = await getSession();
  const normalized = normalizeCode(rawCode);

  if (!normalized) {
    if (session) {
      redirect({ href: `/${session.role}?ref_error=invalid`, locale });
    }
    redirect({ href: "/sign-up?ref_error=invalid", locale });
    return;
  }

  const supabase = await createAdminClient();
  const { data: referralCode, error } = await supabase
    .from("referral_codes")
    .select("user_id, role")
    .eq("code", normalized)
    .maybeSingle();

  if (error || !referralCode) {
    const href = session
      ? `/${session.role}?ref_error=not_found`
      : "/sign-up?ref_error=not_found";
    redirect({ href, locale });
    return;
  }

  if (session) {
    const query =
      session.userId === referralCode.user_id
        ? "ref_error=self"
        : "ref_notice=already_member";
    redirect({ href: `/${session.role}?${query}`, locale });
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, normalized, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });

  // Pre-select the sign-up role: explicit `as` from the link wins (admin
  // invites carry it), otherwise fall back to the referrer's role when it is
  // a sign-up-eligible role.
  const signUpParams = new URLSearchParams({ ref: normalized });
  const overrideRole = asRoleHint(asOverride);
  const referrerRole = asRoleHint(referralCode.role);
  const resolvedAs = overrideRole ?? referrerRole;
  if (resolvedAs) signUpParams.set("as", resolvedAs);
  redirect({ href: `/sign-up?${signUpParams.toString()}`, locale });
}
