"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/get-session";
import { getFacilityProfile } from "@/features/profile/dal/queries";
import { getCurrentUser } from "@/features/users/dal/queries";
import { createAdminClient } from "@/supabase/server";
import { env } from "@/data/env/server";
import { sendDirectEmail } from "@/features/notifications/service/send-direct";
import { enqueueNotification } from "@/features/notifications/service/enqueue";
import {
  insertScreening,
  updateScreening,
  updateScreeningStatus,
  insertScreeningInvite,
  markInviteSent,
} from "./dal/mutations";
import {
  getScreeningById,
  getExistingScreeningInviteEmails,
  type ScreeningInviteRow,
  type ScreeningRow,
} from "./dal/queries";
import { getOperatorEmail } from "@/features/account/server/operator-context";
import {
  assertCanCreateScreening,
  assertCanSendScreeningInvites,
} from "@/features/billing/server/entitlements";
import { OPERATOR_ROLE } from "../auth/types";

// ─── Create screening ─────────────────────────────────────────────────────────

export async function createScreeningAction(data: {
  title: string;
  description: string;
  deadline_days: number;
  interview_duration: number;
  allowed_languages: string[];
  require_identity: boolean;
}): Promise<{ error: true; message: string } | { error: false; id: string }> {
  const session = await getSession();
  if (!session || session.role !== OPERATOR_ROLE) {
    return { error: true, message: "Not authorized" };
  }

  const facility = await getFacilityProfile();
  if (!facility) return { error: true, message: "Facility profile not found" };

  const supabase = await createAdminClient();
  const { data: op, error: opErr } = await supabase
    .from("operators")
    .select("id")
    .eq("user_id", session.userId)
    .eq("facility_id", facility.id)
    .maybeSingle();
  if (opErr || !op) {
    return { error: true, message: "Operator record not found for this facility" };
  }

  const screeningQuota = await assertCanCreateScreening(facility.id);
  if (!screeningQuota.ok) {
    return { error: true, message: screeningQuota.message };
  }

  try {
    const screening = await insertScreening({
      facility_id: facility.id,
      operator_id: op.id,
      title: data.title.trim(),
      description: data.description.trim(),
      deadline_days: data.deadline_days,
      interview_duration: data.interview_duration,
      allowed_languages: data.allowed_languages,
      require_identity: data.require_identity,
    });
    revalidatePath("/app/screenings");
    return { error: false, id: screening.id };
  } catch (e) {
    return {
      error: true,
      message: e instanceof Error ? e.message : "Failed to create screening",
    };
  }
}

// ─── Update screening status ──────────────────────────────────────────────────

export async function updateScreeningStatusAction(
  screeningId: string,
  status: "active" | "paused" | "closed",
): Promise<{ error: true; message: string } | { error: false }> {
  const session = await getSession();
  if (!session || session.role !== OPERATOR_ROLE) {
    return { error: true, message: "Not authorized" };
  }

  const facility = await getFacilityProfile();
  if (!facility) return { error: true, message: "Facility profile not found" };

  try {
    await updateScreeningStatus(screeningId, facility.id, status);
    revalidatePath(`/app/screenings/${screeningId}`);
    revalidatePath("/app/screenings");
    return { error: false };
  } catch (e) {
    return {
      error: true,
      message: e instanceof Error ? e.message : "Failed to update status",
    };
  }
}

// ─── Update screening ─────────────────────────────────────────────────────────

export async function updateScreeningAction(
  screeningId: string,
  data: {
    title: string;
    description: string;
    deadline_days: number;
    interview_duration: number;
    allowed_languages: string[];
    require_identity: boolean;
  },
): Promise<{ error: true; message: string } | { error: false }> {
  const session = await getSession();
  if (!session || session.role !== OPERATOR_ROLE) {
    return { error: true, message: "Not authorized" };
  }

  const facility = await getFacilityProfile();
  if (!facility) return { error: true, message: "Facility profile not found" };

  try {
    await updateScreening(screeningId, facility.id, data);
    revalidatePath(`/app/screenings/${screeningId}`);
    revalidatePath(`/app/screenings/${screeningId}/edit`);
    return { error: false };
  } catch (e) {
    return {
      error: true,
      message: e instanceof Error ? e.message : "Failed to update screening",
    };
  }
}

// ─── Send invite ──────────────────────────────────────────────────────────────

type FacilityLite = { id: string; name: string | null };

async function deliverScreeningInviteNotifications(
  screening: ScreeningRow,
  facility: FacilityLite,
  invite: ScreeningInviteRow,
): Promise<void> {
  const inviteUrl = `${env.APP_URL}/s/${invite.token}`;
  const clientUser = await getCurrentUser();
  const clientName = facility.name ?? clientUser?.email ?? "ReadyKare";

  const deadlineDate = new Date(
    Date.now() + screening.deadline_days * 24 * 60 * 60 * 1000,
  );
  const deadlineDateFormatted = deadlineDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const templateData = {
    inviteUrl,
    clientName,
    screeningTitle: screening.title,
    deadlineDays: screening.deadline_days,
    deadlineDate: deadlineDateFormatted,
    interviewDuration: screening.interview_duration,
  };

  const supabase = await createAdminClient();
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", invite.email)
    .maybeSingle();

  if (existingUser) {
    await enqueueNotification({
      userId: existingUser.id,
      channels: [
        {
          channel: "email",
          subject: `You've been invited to complete a screening for ${screening.title}`,
          template: "screening-invite",
          data: templateData,
        },
      ],
    });
  } else {
    const emailResult = await sendDirectEmail({
      to: invite.email,
      subject: `You've been invited to complete a screening for ${screening.title}`,
      template: "screening-invite",
      data: templateData,
    });
    if (emailResult.status === "failed") {
      throw new Error(emailResult.error);
    }
  }

  const operatorEmail = await getOperatorEmail(screening.operator_id);
  if (operatorEmail) {
    await sendDirectEmail({
      to: operatorEmail,
      subject: `Screening invite sent: ${screening.title}`,
      template: "screening-invite-operator-notify",
      data: {
        screeningTitle: screening.title,
        candidateEmail: invite.email,
      },
    }).catch((err) => {
      console.error("[deliverScreeningInviteNotifications] operator copy failed:", err);
    });
  }

  await markInviteSent(invite.id).catch((err) => {
    console.error("[deliverScreeningInviteNotifications] markInviteSent failed:", err);
  });
}

export async function sendScreeningInviteAction(
  screeningId: string,
  email: string,
): Promise<{ error: true; message: string } | { error: false }> {
  const session = await getSession();
  if (!session || session.role !== OPERATOR_ROLE) {
    return { error: true, message: "Not authorized" };
  }

  const facility = await getFacilityProfile();
  if (!facility) return { error: true, message: "Facility profile not found" };

  const screening = await getScreeningById(screeningId, facility.id);
  if (!screening) return { error: true, message: "Screening not found" };
  if (screening.status !== "active") {
    return { error: true, message: "Screening is not active" };
  }

  const inviteQuota = await assertCanSendScreeningInvites(facility.id, 1);
  if (!inviteQuota.ok) {
    return { error: true, message: inviteQuota.message };
  }

  try {
    const invite = await insertScreeningInvite(screeningId, email.trim().toLowerCase()).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
        throw new Error("already invited");
      }
      throw err;
    });
    await deliverScreeningInviteNotifications(screening, facility, invite);
    revalidatePath(`/app/screenings/${screeningId}`);
    return { error: false };
  } catch (e) {
    return {
      error: true,
      message: e instanceof Error ? e.message : "Failed to send invite",
    };
  }
}

export type ScreeningInviteBatchResultItem =
  | { email: string; ok: true }
  | { email: string; ok: false; message: string };

/**
 * Sends multiple screening invites in one request: one entitlement check for all *new*
 * recipients, then sequential inserts + delivery (no parallel quota races).
 */
export async function sendScreeningInvitesBatchAction(
  screeningId: string,
  rawEmails: string[],
): Promise<{ error: true; message: string } | { error: false; results: ScreeningInviteBatchResultItem[] }> {
  const session = await getSession();
  if (!session || session.role !== OPERATOR_ROLE) {
    return { error: true, message: "Not authorized" };
  }

  const facility = await getFacilityProfile();
  if (!facility) return { error: true, message: "Facility profile not found" };

  const screening = await getScreeningById(screeningId, facility.id);
  if (!screening) return { error: true, message: "Screening not found" };
  if (screening.status !== "active") {
    return { error: true, message: "Screening is not active" };
  }

  const seen = new Set<string>();
  const normalizedOrder: string[] = [];
  for (const raw of rawEmails) {
    const email = raw.trim().toLowerCase();
    if (!email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    normalizedOrder.push(email);
  }

  if (normalizedOrder.length === 0) {
    return { error: true, message: "Enter at least one valid email address" };
  }

  const existing = await getExistingScreeningInviteEmails(screeningId, normalizedOrder);
  const resultsByEmail = new Map<string, ScreeningInviteBatchResultItem>();

  for (const email of normalizedOrder) {
    if (existing.has(email)) {
      resultsByEmail.set(email, { email, ok: false, message: "already invited" });
    }
  }

  const toSend = normalizedOrder.filter((e) => !existing.has(e));

  if (toSend.length === 0) {
    return {
      error: false,
      results: normalizedOrder.map((email) => resultsByEmail.get(email)!),
    };
  }

  const quota = await assertCanSendScreeningInvites(facility.id, toSend.length);
  if (!quota.ok) {
    return { error: true, message: quota.message };
  }

  for (const email of toSend) {
    try {
      const invite = await insertScreeningInvite(screeningId, email).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
          throw new Error("already invited");
        }
        throw err;
      });
      await deliverScreeningInviteNotifications(screening, facility, invite);
      resultsByEmail.set(email, { email, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to send invite";
      resultsByEmail.set(email, { email, ok: false, message: msg });
    }
  }

  revalidatePath(`/app/screenings/${screeningId}`);
  return {
    error: false,
    results: normalizedOrder.map((email) => resultsByEmail.get(email)!),
  };
}

// ─── Revoke invite (soft; audit trail) ─────────────────────────────────────────

export async function revokeScreeningInviteAction(
  screeningId: string,
  inviteId: string,
): Promise<{ error: true; message: string } | { error: false }> {
  const session = await getSession();
  if (!session || session.role !== OPERATOR_ROLE) {
    return { error: true, message: "Not authorized" };
  }

  const facility = await getFacilityProfile();
  if (!facility) return { error: true, message: "Facility profile not found" };

  const screening = await getScreeningById(screeningId, facility.id);
  if (!screening) return { error: true, message: "Screening not found" };

  const supabase = await createAdminClient();
  const { data: invite, error: fetchErr } = await supabase
    .from("screening_invites")
    .select("id, screening_id, status")
    .eq("id", inviteId)
    .maybeSingle();

  if (fetchErr || !invite || invite.screening_id !== screeningId) {
    return { error: true, message: "Invite not found" };
  }

  if (invite.status === "revoked") {
    return { error: false };
  }

  const { error } = await supabase
    .from("screening_invites")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: session.userId,
    })
    .eq("id", inviteId)
    .eq("screening_id", screeningId);

  if (error) return { error: true, message: error.message };

  revalidatePath(`/app/screenings/${screeningId}`);
  return { error: false };
}
