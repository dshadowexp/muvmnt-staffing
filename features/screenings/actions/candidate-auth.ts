"use server";

import { getAdminAuth } from "@/services/firebase/admin";
import { createAdminClient } from "@/supabase/server";

/**
 * Resolves a screening invite token → generates a Firebase custom token
 * so the candidate can be signed in silently without a password.
 *
 * Flow:
 *   1. Look up screening_invites by token → get email
 *   2. Get or create a Firebase user for that email (via Admin SDK)
 *   3. Return a short-lived Firebase custom token + the invite email
 */
export async function generateCandidateTokenAction(
  screeningToken: string,
): Promise<{ firebaseToken: string; email: string } | { error: string }> {
  try {
    const supabase = await createAdminClient();

    // Resolve token → invite
    const { data: invite } = await supabase
      .from("screening_invites")
      .select("email")
      .eq("token", screeningToken)
      .maybeSingle();

    if (!invite) return { error: "This invite link is invalid or has expired." };

    const email = invite.email.trim().toLowerCase();
    const adminAuth = getAdminAuth();

    // Get or create the Firebase user for this email
    let uid: string;
    try {
      const existing = await adminAuth.getUserByEmail(email);
      uid = existing.uid;
    } catch {
      // User doesn't exist in Firebase yet — create them
      const created = await adminAuth.createUser({
        email,
        emailVerified: false,
        disabled: false,
      });
      uid = created.uid;
    }

    // Generate a Firebase custom token (valid for 1 hour)
    const firebaseToken = await adminAuth.createCustomToken(uid);

    return { firebaseToken, email };
  } catch (err) {
    console.error("[generateCandidateTokenAction]", err);
    return { error: "Something went wrong. Please try again." };
  }
}
