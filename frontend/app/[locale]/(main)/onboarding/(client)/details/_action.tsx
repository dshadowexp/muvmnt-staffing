"use server";

import { createClientAction } from "@/features/profile/actions/client-actions";
import { clientSchema } from "@/features/profile/schemas/client";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { redirect } from "next/navigation";

export async function detailsAction(formData: FormData): Promise<void> {
  const { user } = await getCurrentUser({ allData: true });
  if (!user) throw new Error("User not found");
  if (user.role !== "client") throw new Error("User is not authorized");

  const raw = Object.fromEntries(formData);
  const toParse = {
    ...raw,
  };

  console.log(toParse);
  const { success, data } = clientSchema.safeParse(toParse);
  if (!success) throw new Error("Invalid client data");

  const { error, message } = await createClientAction(data);
  if (error) throw new Error(message);

  redirect("/onboarding/location"); 
}