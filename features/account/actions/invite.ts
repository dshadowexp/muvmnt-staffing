"use server";

import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/supabase/server";
import { sendDirectEmail } from "@/features/notifications/service/send-direct";
import { env } from "@/data/env/server";
import { randomUUID } from "crypto";

import { assertCanAddFacilityTeamInvites } from "@/features/billing/server/entitlements";
import { OPERATOR_ROLE, OperatorPermission } from "@/features/auth/types";

type ActionResult = { error: false; message: string } | { error: true; message: string };

const INVITER_ROLES = new Set(["owner", "manager"]);

/** Public preview for magic-link landing page (token acts as secret). */
export async function previewFacilityTeamInviteAction(token: string): Promise<
  | { ok: true; email: string; facilityName: string; expiresAt: string }
  | { ok: false; reason: "invalid" | "expired" | "used" }
> {
  const t = token.trim();
  if (!t) return { ok: false, reason: "invalid" };

  const supabase = await createAdminClient();
  const now = new Date().toISOString();

  const { data: row, error } = await supabase
    .from("facility_invites")
    .select("email, expires_at, accepted_at, facility_id")
    .eq("token", t)
    .maybeSingle();

  if (error || !row) return { ok: false, reason: "invalid" };
  if (row.accepted_at) return { ok: false, reason: "used" };
  if (row.expires_at && row.expires_at <= now) return { ok: false, reason: "expired" };

  const { data: fac } = await supabase
    .from("facilities")
    .select("name")
    .eq("id", row.facility_id)
    .maybeSingle();

  const facilityName = fac?.name ?? "your organization";

  return {
    ok: true,
    email: row.email,
    facilityName,
    expiresAt: row.expires_at,
  };
}

/** Send one or more email invitations for a facility (DB row + email with magic link). */
export async function sendFacilityInviteAction(
  emails: string[],
  permission: OperatorPermission,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: true, message: "User not authenticated" };
  if (session.role !== OPERATOR_ROLE) return { error: true, message: "Not authorized" };

  const { userId, facilityId } = session;
  if (!facilityId) return { error: true, message: "No facility found" };

  const supabase = await createAdminClient();

  const { data: self } = await supabase
    .from("operators")
    .select("permission")
    .eq("facility_id", facilityId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!self || !INVITER_ROLES.has(self.permission)) {
    return {
      error: true,
      message: "Only owners and managers can send invitations.",
    };
  }

  const { data: facility } = await supabase
    .from("facilities")
    .select("name")
    .eq("id", facilityId)
    .maybeSingle();

  const facilityName = facility?.name ?? "your organization";
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const tMail = await getTranslations("account.teamInviteEmail");

  const emailsToInvite: string[] = [];
  const seen = new Set<string>();
  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    if (!email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    emailsToInvite.push(email);
  }

  const seatCheck = await assertCanAddFacilityTeamInvites(facilityId, emailsToInvite.length);
  if (!seatCheck.ok) {
    return { error: true, message: seatCheck.message };
  }

  let sent = 0;
  let skipped = 0;
  let emailFailures = 0;

  for (const email of emailsToInvite) {
    const token = randomUUID();
    const { error: insErr } = await supabase.from("facility_invites").insert({
      facility_id: facilityId,
      email,
      permission,
      token,
      invited_by: userId,
      expires_at: expiresAt,
    });

    if (insErr) {
      if (insErr.code === "23505" || insErr.message.includes("duplicate")) {
        skipped += 1;
      } else {
        return { error: true, message: insErr.message };
      }
      continue;
    }

    const joinUrl = new URL(`/join/team/${token}`, env.APP_URL).href;
    const expiresDate = new Date(expiresAt).toLocaleDateString("en-US", {
      dateStyle: "long",
    });

    const mail = await sendDirectEmail({
      to: email,
      subject: tMail("subject", { facilityName }),
      template: "facility-team-invite",
      data: {
        facilityName,
        email,
        joinUrl,
        expiresDate,
        previewText: tMail("preview", { facilityName }),
        unsubscribeUrl: joinUrl,
        privacyUrl: new URL("/privacy", env.APP_URL).href,
      },
    });

    if (mail.status === "sent") {
      sent += 1;
    } else {
      emailFailures += 1;
    }
  }

  if (sent === 0 && skipped > 0 && emailFailures === 0) {
    return {
      error: true,
      message:
        "Those addresses already have a pending invitation for this organization.",
    };
  }

  const parts: string[] = [];
  if (sent > 0) parts.push(`${sent} invitation${sent === 1 ? "" : "s"} sent`);
  if (skipped > 0) parts.push(`${skipped} skipped (already invited)`);
  if (emailFailures > 0) parts.push(`${emailFailures} email(s) failed to send — check logs`);

  return {
    error: false,
    message: parts.join(". ") || "Done.",
  };
}

/** Leave the current facility team. Blocks if the user is the sole owner. */
export async function leaveTeamAction(): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: true, message: "User not authenticated" };
  if (session.role !== OPERATOR_ROLE) return { error: true, message: "Not authorized" };

  const { userId, facilityId } = session;
  if (!facilityId) return { error: true, message: "No facility found" };

  const supabase = await createAdminClient();

  const { data: self, error: selfErr } = await supabase
    .from("operators")
    .select("id, permission")
    .eq("facility_id", facilityId)
    .eq("user_id", userId)
    .maybeSingle();

  if (selfErr) return { error: true, message: selfErr.message };
  if (!self) return { error: true, message: "You are not a member of this facility" };

  if (self.permission === "owner") {
    const { data: owners, error: ownerErr } = await supabase
      .from("operators")
      .select("id")
      .eq("facility_id", facilityId)
      .eq("permission", "owner");

    if (ownerErr) return { error: true, message: ownerErr.message };
    if (!owners || owners.length <= 1) {
      return { error: true, message: "You cannot leave as you are the sole owner" };
    }
  }

  const { error } = await supabase
    .from("operators")
    .delete()
    .eq("id", self.id)
    .eq("facility_id", facilityId);

  if (error) return { error: true, message: error.message };
  return { error: false, message: "You have left the team" };
}

/** Revoke a pending invite (scoped to the current user's facility). */
export async function revokeInviteAction(inviteId: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: true, message: "User not authenticated" };
  if (session.role !== OPERATOR_ROLE) return { error: true, message: "Not authorized" };

  const { facilityId } = session;
  if (!facilityId) return { error: true, message: "No facility found" };

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("facility_invites")
    .delete()
    .eq("id", inviteId)
    .eq("facility_id", facilityId);

  if (error) return { error: true, message: error.message };
  return { error: false, message: "Invite revoked" };
}
