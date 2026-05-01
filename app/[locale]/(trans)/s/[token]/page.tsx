import { CircleDashedIcon } from "lucide-react";
import { Suspense } from "react";
import { getLocale } from "next-intl/server";
import { getSession } from "@/lib/get-session";
import { getCurrentUser } from "@/features/users/dal/queries";
import { createAdminClient } from "@/supabase/server";
import { resolveScreeningToken, type CandidateIdentityVerification } from "@/features/screenings/dal/queries";
import { getOrCreateScreeningCandidate } from "@/features/screenings/dal/mutations";
import { redirect } from "@/i18n/navigation";
import { ScreeningCandidateClient } from "./_client";
import { CANDIDATE_ROLE, STAFF_ROLE } from "@/features/auth/types";

export default async function ScreeningTokenPage({
  params,
}: {
  params: Promise<{ token: string; locale: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <CircleDashedIcon className="size-10 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SuspendedContent params={params} />
    </Suspense>
  );
}

async function SuspendedContent({
  params,
}: {
  params: Promise<{ token: string; locale: string }>;
}) {
  const { token } = await params;
  const locale = await getLocale();

  // Always resolve the token so we can show screening context even before auth
  const resolved = await resolveScreeningToken(token);

  if (!resolved) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold">Invite not found</h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          This link is invalid or has already been used. Check your email for a valid invite link.
        </p>
      </div>
    );
  }

  if (resolved.screening.status !== "active") {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold">Screening closed</h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          This screening is no longer accepting candidates.
        </p>
      </div>
    );
  }

  const { screening, invite } = resolved;

  const session = await getSession();

  // Not authenticated — hand off to client.
  if (!session) {
    return (
      <ScreeningCandidateClient
        token={token}
        screening={screening}
        candidate={null}
        inviteEmail={invite.email}
        locale={locale}
      />
    );
  }

  // Only candidates and workers may access screening links
  if (session.role !== CANDIDATE_ROLE && session.role !== STAFF_ROLE) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold">Wrong account type</h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          This link is intended for candidates or workers. Please sign in with the correct account.
        </p>
      </div>
    );
  }

  // Get or create the candidate row
  const user = await getCurrentUser();
  if (!user) {
    return (
      <ScreeningCandidateClient
        token={token}
        screening={screening}
        candidate={null}
        inviteEmail={invite.email}
        locale={locale}
      />
    );
  }

  const candidate = await getOrCreateScreeningCandidate(
    session.userId,
    screening.id,
    invite.id,
    user.email ?? "",
  );

  // Deadline check — skip for completed candidates
  if (candidate.stage !== "completed") {
    const sentAt = invite.sent_at ?? invite.created_at;
    const deadlineMs =
      new Date(sentAt).getTime() + screening.deadline_days * 24 * 60 * 60 * 1000;
    if (Date.now() > deadlineMs) {
      return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-2xl font-semibold">Deadline passed</h1>
          <p className="text-muted-foreground text-sm max-w-sm">
            The deadline to complete this screening has passed. Please contact
            the employer if you believe this is an error.
          </p>
        </div>
      );
    }
  }

  // Interview stage — check identity, then redirect
  if (candidate.stage === "interview") {
    const candidateIv =
      (candidate.identity_verification ?? null) as CandidateIdentityVerification | null;
    const needsIdentity = screening.require_identity && !candidateIv?.verified;

    if (!needsIdentity) {
      const supabase = await createAdminClient();
      const { data: interviewRow } = await supabase
        .from("interviews")
        .select("id")
        .eq("user_id", session.userId)
        .eq("screening_id", screening.id)
        .maybeSingle();

      if (interviewRow?.id) {
        return redirect({ href: `/interviews/${interviewRow.id}`, locale });
      }
    }
  }

  const candidateIv =
    (candidate.identity_verification ?? null) as CandidateIdentityVerification | null;
  const showIdentityStep =
    candidate.stage === "interview" &&
    screening.require_identity &&
    !candidateIv?.verified;

  return (
    <ScreeningCandidateClient
      token={token}
      screening={screening}
      candidate={candidate}
      inviteEmail={invite.email}
      locale={locale}
      showIdentityStep={showIdentityStep}
    />
  );
}
