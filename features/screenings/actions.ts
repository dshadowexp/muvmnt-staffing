"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { getFacilityProfile } from "@/features/profile/dal/queries";
import { getCurrentUser } from "@/features/users/dal/queries";
import { createAdminClient } from "@/services/supabase/server";
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
import { getScreeningById } from "./dal/queries";

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
  if (!session || session.role !== "client") {
    return { error: true, message: "Not authorized" };
  }

  const facility = await getFacilityProfile();
  if (!facility) return { error: true, message: "Facility profile not found" };

  try {
    const screening = await insertScreening({
      facility_id: facility.id,
      title: data.title.trim(),
      description: data.description.trim(),
      deadline_days: data.deadline_days,
      interview_duration: data.interview_duration,
      allowed_languages: data.allowed_languages,
      require_identity: data.require_identity,
    });
    revalidatePath("/dashboard/screenings");
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
  if (!session || session.role !== "client") {
    return { error: true, message: "Not authorized" };
  }

  const facility = await getFacilityProfile();
  if (!facility) return { error: true, message: "Facility profile not found" };

  try {
    await updateScreeningStatus(screeningId, facility.id, status);
    revalidatePath(`/dashboard/screenings/${screeningId}`);
    revalidatePath("/dashboard/screenings");
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
  if (!session || session.role !== "client") {
    return { error: true, message: "Not authorized" };
  }

  const facility = await getFacilityProfile();
  if (!facility) return { error: true, message: "Facility profile not found" };

  try {
    await updateScreening(screeningId, facility.id, data);
    revalidatePath(`/dashboard/screenings/${screeningId}`);
    revalidatePath(`/dashboard/screenings/${screeningId}/edit`);
    return { error: false };
  } catch (e) {
    return {
      error: true,
      message: e instanceof Error ? e.message : "Failed to update screening",
    };
  }
}

// ─── Send invite ──────────────────────────────────────────────────────────────

export async function sendScreeningInviteAction(
  screeningId: string,
  email: string,
): Promise<{ error: true; message: string } | { error: false }> {
  const session = await getSession();
  if (!session || session.role !== "client") {
    return { error: true, message: "Not authorized" };
  }

  const facility = await getFacilityProfile();
  if (!facility) return { error: true, message: "Facility profile not found" };

  const screening = await getScreeningById(screeningId, facility.id);
  if (!screening) return { error: true, message: "Screening not found" };
  if (screening.status !== "active") {
    return { error: true, message: "Screening is not active" };
  }

  try {
    const invite = await insertScreeningInvite(screeningId, email.trim().toLowerCase()).catch((err: unknown) => {
      // Supabase unique constraint → friendly message instead of raw Postgres error
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
        throw new Error("already invited");
      }
      throw err;
    });
    const inviteUrl = `${env.APP_URL}/s/${invite.token}`;
    const clientUser = await getCurrentUser();
    const clientName = facility.name ?? clientUser?.email ?? "ReadyKare";

    // Pre-compute deadline date from the moment the invite is sent
    const deadlineDate = new Date(
      Date.now() + screening.deadline_days * 24 * 60 * 60 * 1000
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

    // Check if this email belongs to an existing user
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

    // Non-fatal: the invite was already created and the email sent.
    // If the status update fails (e.g. missing column migration), we log
    // rather than surfacing a false error to the user.
    await markInviteSent(invite.id).catch((err) => {
      console.error("[sendScreeningInviteAction] markInviteSent failed:", err);
    });

    revalidatePath(`/dashboard/screenings/${screeningId}`);
    return { error: false };
  } catch (e) {
    return {
      error: true,
      message: e instanceof Error ? e.message : "Failed to send invite",
    };
  }
}
