import { CircleDashedIcon } from "lucide-react";
import { Suspense } from "react";
import { getLocale } from "next-intl/server";
import { getSession } from "@/lib/session";
import { getCurrentUser, isWorkerEmail } from "@/features/users/dal/queries";
import { createAdminClient } from "@/services/supabase/server";
import { resolveScreeningToken } from "@/features/screenings/dal/queries";
import { getOrCreateScreeningCandidate } from "@/features/screenings/dal/mutations";
import { redirect } from "@/i18n/navigation";
import { ScreeningCandidateClient } from "./_client";

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

  // Check if the invite email belongs to a worker — runs before auth so the
  // unauthenticated gate can show the right UI even for logged-out workers.
  const workerInvite = await isWorkerEmail(invite.email);

  const session = await getSession();

  // Not authenticated — hand off to client (auth gate uses workerInvite to
  // decide whether to show sign-up or sign-in first).
  if (!session) {
    return (
      <ScreeningCandidateClient
        token={token}
        screening={screening}
        candidate={null}
        isWorkerInvite={workerInvite}
        locale={locale}
      />
    );
  }

  // Wrong role — only candidates and workers may access screening links
  if (session.role !== "candidate" && session.role !== "worker") {
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
        isWorkerInvite={workerInvite}
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

  // Interview stage — redirect to the single interview entry point
  if (candidate.stage === "interview") {
    const supabase = await createAdminClient();
    const { data: iv } = await supabase
      .from("interviews")
      .select("id")
      .eq("user_id", session.userId)
      .eq("screening_id", screening.id)
      .maybeSingle();

    if (iv?.id) {
      return redirect({ href: `/interviews/${iv.id}`, locale });
    }
  }

  return (
    <ScreeningCandidateClient
      token={token}
      screening={screening}
      candidate={candidate}
      isWorkerInvite={workerInvite}
      locale={locale}
    />
  );
}
