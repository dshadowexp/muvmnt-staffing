"use server";

import { deleteSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function adminSignOut() {
  await deleteSession();
  redirect("/sign-in");
}
