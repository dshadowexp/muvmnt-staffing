"use server";

import { cookies } from "next/headers";
import { LINKEDIN_FIREBASE_HANDOFF_COOKIE } from "@/lib/constants";

/** Read handoff token without deleting (safe for React Strict Mode double effects). */
export async function peekLinkedInFirebaseToken(): Promise<
  { ok: true; token: string } | { ok: false }
> {
  const jar = await cookies();
  const token = jar.get(LINKEDIN_FIREBASE_HANDOFF_COOKIE)?.value;
  if (!token) return { ok: false };
  return { ok: true, token };
}

/** Remove handoff cookie after successful sign-in or to discard a bad token. */
export async function clearLinkedInHandoffCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(LINKEDIN_FIREBASE_HANDOFF_COOKIE);
}
