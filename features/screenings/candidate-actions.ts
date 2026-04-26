"use server";

import { getSession } from "@/lib/session";
import { getCurrentUser } from "@/features/users/dal/queries";
import {
  getOrCreateScreeningCandidate,
  updateCandidateStage,
  updateCandidateIdentityVerification,
  insertScreeningInterview,
} from "./dal/mutations";
import {
  resolveScreeningToken,
  getScreeningCandidate,
  type CandidateIdentityVerification,
} from "./dal/queries";
import { getStripeServer } from "@/services/stripe/server";
import { env } from "@/data/env/server";

// ─── Join / get-or-create ─────────────────────────────────────────────────────

export async function joinScreeningAction(token: string): Promise<
  | { error: true; message: string }
  | { error: false; screeningId: string; inviteId: string | null }
> {
  const session = await getSession();
  if (!session) return { error: true, message: "Not authenticated" };
  if (session.role !== "candidate") {
    return { error: true, message: "This page is for candidates only" };
  }

  const resolved = await resolveScreeningToken(token);
  if (!resolved) return { error: true, message: "Screening not found" };
  const { screening, invite } = resolved;
  if (screening.status !== "active") {
    return { error: true, message: "This screening is no longer accepting candidates" };
  }

  const user = await getCurrentUser();
  if (!user) return { error: true, message: "User not found" };

  await getOrCreateScreeningCandidate(
    session.userId,
    screening.id,
    invite?.id ?? null,
    user.email ?? "",
  );

  return { error: false, screeningId: screening.id, inviteId: invite?.id ?? null };
}

// ─── Details → interview ──────────────────────────────────────────────────────
// Saves name, creates the bare interview row, advances stage to "interview".
// The photo/resume steps happen inside /interviews/[id] — no separate stages needed.

export async function saveCandidateDetailsAction(
  screeningId: string,
  data: { firstName: string; lastName: string },
): Promise<
  | { error: true; message: string }
  | { error: false; interviewId: string }
> {
  const session = await getSession();
  if (!session || session.role !== "candidate") {
    return { error: true, message: "Not authorized" };
  }

  const candidate = await getScreeningCandidate(session.userId, screeningId);
  if (!candidate) return { error: true, message: "Candidate record not found" };

  // Idempotent: already past details
  if (candidate.stage !== "details") {
    const { createAdminClient } = await import("@/services/supabase/server");
    const supabase = await createAdminClient();
    const { data: iv } = await supabase
      .from("interviews")
      .select("id")
      .eq("user_id", session.userId)
      .eq("screening_id", screeningId)
      .maybeSingle();
    return iv
      ? { error: false, interviewId: iv.id }
      : { error: true, message: "Interview not found" };
  }

  try {
    // Create the interview row first (idempotent inside)
    const interview = await insertScreeningInterview(session.userId, screeningId);

    // Save name and advance directly to "interview" — photo/resume happen in /interviews/[id]
    await updateCandidateStage(session.userId, screeningId, "interview", {
      first_name: data.firstName.trim() || null,
      last_name: data.lastName.trim() || null,
    });

    return { error: false, interviewId: interview.id };
  } catch (e) {
    return {
      error: true,
      message: e instanceof Error ? e.message : "Failed to save details",
    };
  }
}

// ─── Save photo (called from /interviews/[id] photo step) ─────────────────────
// Saves the S3 key to screening_candidates.photo_url — no stage change.

export async function saveCandidatePhotoAction(
  screeningId: string,
  photoKey: string,
): Promise<{ error: true; message: string } | { error: false }> {
  const session = await getSession();
  if (!session || session.role !== "candidate") {
    return { error: true, message: "Not authorized" };
  }

  const candidate = await getScreeningCandidate(session.userId, screeningId);
  if (!candidate) return { error: true, message: "Candidate record not found" };

  try {
    await updateCandidateStage(session.userId, screeningId, candidate.stage, {
      photo_url: photoKey,
    });
    return { error: false };
  } catch (e) {
    return {
      error: true,
      message: e instanceof Error ? e.message : "Failed to save photo",
    };
  }
}

// ─── Candidate identity verification ─────────────────────────────────────────

export async function createCandidateIdentityVerificationAction(
  screeningId: string,
  returnUrl: string,
): Promise<
  | { error: true; message: string }
  | { error: false; url?: string; alreadyVerified?: true }
> {
  const session = await getSession();
  if (!session || session.role !== "candidate") {
    return { error: true, message: "Not authorized" };
  }

  const candidate = await getScreeningCandidate(session.userId, screeningId);
  if (!candidate) return { error: true, message: "Candidate not found" };

  const iv = (candidate.identity_verification ?? null) as CandidateIdentityVerification | null;

  if (iv?.verified) return { error: false, alreadyVerified: true };

  const stripe = getStripeServer();

  // Try to resume an existing requires_input session
  if (iv?.session_id) {
    try {
      const existing = await stripe.identity.verificationSessions.retrieve(iv.session_id);
      if (existing.status === "requires_input" && existing.url) {
        return { error: false, url: existing.url };
      }
      if (existing.status === "verified") {
        // Webhook hasn't fired yet — mark locally
        await updateCandidateIdentityVerification(session.userId, screeningId, {
          verified: true,
          verified_at: new Date().toISOString(),
          session_id: iv.session_id,
        });
        return { error: false, alreadyVerified: true };
      }
    } catch {
      // Fall through to create a new session
    }
  }

  // Create a new Stripe Identity session
  let stripeSession: Awaited<ReturnType<typeof stripe.identity.verificationSessions.create>>;
  try {
    stripeSession = await stripe.identity.verificationSessions.create({
      type: "document",
      client_reference_id: session.userId,
      return_url: returnUrl,
      metadata: {
        type: "candidate",
        user_id: session.userId,
        screening_candidate_id: candidate.id,
      },
    });
  } catch (e) {
    return {
      error: true,
      message: e instanceof Error ? e.message : "Failed to create verification session",
    };
  }

  if (!stripeSession.url) {
    return { error: true, message: "Stripe did not return a verification URL. Please try again." };
  }

  await updateCandidateIdentityVerification(session.userId, screeningId, {
    verified: false,
    verified_at: null,
    session_id: stripeSession.id,
  });

  return { error: false, url: stripeSession.url };
}

// ─── Complete (called from finalizeInterviewRecording) ────────────────────────

export async function completeCandidateInterviewAction(
  screeningId: string,
): Promise<void> {
  const session = await getSession();
  if (!session) return;
  try {
    await updateCandidateStage(session.userId, screeningId, "completed");
  } catch {
    // Non-fatal
  }
}
