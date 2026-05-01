"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/get-session";
import { saveWorkerAvailabilityBundle } from "./dal/mutations";
import { availabilityOnboardingPayloadSchema } from "./schema";
import { STAFF_ROLE } from "../auth/types";

export type UpdateWorkerAvailabilityState =
  | undefined
  | { ok: true }
  | { ok: false; error: string };

export async function updateWorkerAvailabilityAppAction(
  _prev: UpdateWorkerAvailabilityState,
  formData: FormData,
): Promise<UpdateWorkerAvailabilityState> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Not signed in" };
  }
  if (session.role !== STAFF_ROLE) {
    return { ok: false, error: "Only workers can update availability" };
  }

  const raw = formData.get("payload");
  if (typeof raw !== "string") {
    return { ok: false, error: "Invalid submission" };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, error: "Invalid submission" };
  }

  const parsed = availabilityOnboardingPayloadSchema.safeParse(parsedJson);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Check your availability";
    return { ok: false, error: msg };
  }

  const saved = await saveWorkerAvailabilityBundle(parsed.data);
  if (saved.error) {
    return { ok: false, error: saved.message };
  }

  revalidatePath("/staff/availability");
  revalidatePath("/staff/availability/edit");

  return { ok: true };
}
