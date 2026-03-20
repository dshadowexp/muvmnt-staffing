"use server";

import { upsertWorkerAction } from "@/features/profile/actions/worker-actions";
import { workerSchema } from "@/features/profile/schemas/worker";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { redirect } from "next/navigation";

export async function profileAction(formData: FormData): Promise<void> {
  const { user } = await getCurrentUser({ allData: true });
  if (!user) throw new Error("User not found");
  if (user.role !== "worker") throw new Error("User is not authorized");

  const raw = Object.fromEntries(formData);
  const toParse = {
    ...raw,
    yearsExp: raw.yearsExp ? parseInt(String(raw.yearsExp), 10) : 0,
  };
  const { success, data } = workerSchema.safeParse(toParse);
  if (!success) throw new Error("Invalid worker data");

  const { error, message } = await upsertWorkerAction(data);
  if (error) throw new Error(message);

  redirect("/onboarding/location");
}