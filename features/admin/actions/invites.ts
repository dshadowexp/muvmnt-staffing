"use server";

import { getSession } from "@/lib/get-session";
import { sendDirectEmail } from "@/features/notifications/service/send-direct";
import {
  createReferralCode,
} from "@/features/referrals/dal/mutations";
import { getReferralCode } from "@/features/referrals/dal/queries";
import {
  buildReferralUrl,
  type ReferralRoleHint,
} from "@/features/referrals/lib/build-referral-url";
import { OPERATOR_ROLE, STAFF_ROLE } from "@/features/auth/types";

export type AdminInviteResult = {
  sent: number;
  failed: Array<{ email: string; error: string }>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  return EMAIL_RE.test(trimmed) ? trimmed : null;
}

/**
 * Look up (or create) the calling admin's referral code so every invite link
 * carries an attribution back to who sent it.
 */
async function ensureAdminReferralCode(): Promise<string> {
  const existing = await getReferralCode();
  if (existing.code) return existing.code;
  const created = await createReferralCode();
  if (!created.code) {
    throw new Error(created.error ?? "Could not create admin referral code");
  }
  return created.code;
}

type InviteRecipient = { email: string; name?: string | null };

async function sendInvitations({
  recipients,
  as,
  template,
  subject,
}: {
  recipients: InviteRecipient[];
  as: ReferralRoleHint;
  template: "invite-worker" | "invite-client";
  subject: string;
}): Promise<AdminInviteResult> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    throw new Error("Forbidden");
  }

  // Pre-flight: ensure we have a referral code once for the whole batch
  // instead of per-email.
  const code = await ensureAdminReferralCode();
  const inviteUrl = buildReferralUrl(code, { as });

  const dedup = new Map<string, InviteRecipient>();
  for (const r of recipients) {
    const email = normalizeEmail(r.email);
    if (!email) continue;
    if (!dedup.has(email)) dedup.set(email, { email, name: r.name ?? null });
  }

  const result: AdminInviteResult = { sent: 0, failed: [] };

  await Promise.all(
    Array.from(dedup.values()).map(async (recipient) => {
      const sendResult = await sendDirectEmail({
        to: recipient.email,
        subject,
        template,
        data: {
          inviteUrl,
          inviterName: null,
          recipientName: recipient.name ?? null,
          previewText: subject,
          unsubscribeUrl: inviteUrl,
          privacyUrl: inviteUrl,
        },
      });
      if (sendResult.status === "sent") {
        result.sent += 1;
      } else {
        result.failed.push({ email: recipient.email, error: sendResult.error });
      }
    }),
  );

  return result;
}

/**
 * Email a single client an invitation that lands them on `/sign-up?as=client`
 * with the admin's referral code applied via cookie.
 */
export async function sendClientInviteAction(input: {
  name: string;
  email: string;
  segment: "individual" | "organization";
}): Promise<AdminInviteResult> {
  return sendInvitations({
    recipients: [{ email: input.email, name: input.name }],
    as: OPERATOR_ROLE,
    template: "invite-client",
    subject: "You're invited to join readykare",
  });
}

/**
 * Email one or more workers an invitation. Filters out duplicates and
 * malformed addresses; returns per-address success / failure counts so the
 * UI can surface partial failures.
 */
export async function sendWorkerInvitesAction(input: {
  emails: string[];
}): Promise<AdminInviteResult> {
  return sendInvitations({
    recipients: input.emails.map((email) => ({ email })),
    as: STAFF_ROLE,
    template: "invite-worker",
    subject: "You're invited to join readykare",
  });
}
