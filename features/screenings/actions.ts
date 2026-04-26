"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { getClientProfile } from "@/features/profile/dal/queries";
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
}): Promise<{ error: true; message: string } | { error: false; id: string }> {
  const session = await getSession();
  if (!session || session.role !== "client") {
    return { error: true, message: "Not authorized" };
  }

  const client = await getClientProfile();
  if (!client) return { error: true, message: "Client profile not found" };

  try {
    const screening = await insertScreening({
      client_id: client.id,
      title: data.title.trim(),
      description: data.description.trim(),
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

  const client = await getClientProfile();
  if (!client) return { error: true, message: "Client profile not found" };

  try {
    await updateScreeningStatus(screeningId, client.id, status);
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
  data: { title: string; description: string },
): Promise<{ error: true; message: string } | { error: false }> {
  const session = await getSession();
  if (!session || session.role !== "client") {
    return { error: true, message: "Not authorized" };
  }

  const client = await getClientProfile();
  if (!client) return { error: true, message: "Client profile not found" };

  try {
    await updateScreening(screeningId, client.id, data);
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

  const client = await getClientProfile();
  if (!client) return { error: true, message: "Client profile not found" };

  const screening = await getScreeningById(screeningId, client.id);
  if (!screening) return { error: true, message: "Screening not found" };
  if (screening.status !== "active") {
    return { error: true, message: "Screening is not active" };
  }

  try {
    const invite = await insertScreeningInvite(screeningId, email.trim().toLowerCase());
    const inviteUrl = `${env.APP_URL}/s/${invite.token}`;
    const clientUser = await getCurrentUser();
    const clientName = client.name ?? clientUser?.email ?? "ReadyKare";

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
            subject: `You've been invited to complete a screening`,
            template: "screening-invite",
            data: {
              inviteUrl,
              clientName,
              screeningTitle: screening.title,
            },
          },
        ],
      });
    } else {
      await sendDirectEmail({
        to: invite.email,
        subject: `You've been invited to complete a screening`,
        template: "screening-invite",
        data: {
          inviteUrl,
          clientName,
          screeningTitle: screening.title,
        },
      });
    }

    await markInviteSent(invite.id);
    revalidatePath(`/dashboard/screenings/${screeningId}`);
    return { error: false };
  } catch (e) {
    return {
      error: true,
      message: e instanceof Error ? e.message : "Failed to send invite",
    };
  }
}
