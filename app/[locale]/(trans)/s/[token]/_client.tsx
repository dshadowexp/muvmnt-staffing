"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/features/auth/providers/auth-provider";
import type { ScreeningRow, ScreeningCandidateRow } from "@/features/screenings/dal/queries";
import { DetailsStep } from "./_steps/details";
import { IdentityStep } from "./_steps/identity";
import { CompletedStep } from "./_steps/completed";
import { generateCandidateTokenAction } from "@/features/screenings/actions/candidate-auth";
import { signInWithCustomToken } from "@/services/firebase/auth";
import { Button } from "@/components/ui/button";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { ArrowRightIcon, MailIcon, ShieldCheckIcon } from "lucide-react";
import { toast } from "sonner";

type Props = {
  token: string;
  screening: ScreeningRow;
  candidate: ScreeningCandidateRow | null;
  inviteEmail: string;
  locale: string;
  showIdentityStep?: boolean;
};

// ─── Candidate Magic-Link Gate ────────────────────────────────────────────────

function CandidateAccessGate({
  token,
  screening,
  inviteEmail,
}: {
  token: string;
  screening: ScreeningRow;
  inviteEmail: string;
}) {
  const { setPendingRole } = useAuth();
  const [isPending, startTransition] = useTransition();

  function handleContinue() {
    startTransition(async () => {
      // Set role before sign-in so the auth provider creates a candidate row
      setPendingRole("candidate");

      const result = await generateCandidateTokenAction(token);

      if ("error" in result) {
        toast.error(result.error);
        setPendingRole(null);
        return;
      }

      try {
        await signInWithCustomToken(result.firebaseToken);
        // onAuthStateChanged in AuthProvider handles the rest:
        // runTokenExchange → setSession → router.refresh()
      } catch {
        toast.error("Sign-in failed. Please try again.");
        setPendingRole(null);
      }
    });
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center size-12 rounded-full bg-primary/10 mb-4">
            <ShieldCheckIcon className="size-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{screening.title}</h1>
          <p className="text-sm text-muted-foreground">
            You&apos;ve been invited to complete this screening.
          </p>
        </div>

        {/* Email card */}
        <div className="rounded-xl border bg-card shadow-sm p-6 space-y-5">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Signing in as
            </p>
            <div className="flex items-center gap-2.5 rounded-lg border bg-muted/40 px-3.5 py-2.5">
              <MailIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="text-sm font-medium truncate">{inviteEmail}</span>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={isPending}
            onClick={handleContinue}
          >
            <LoadingSwap isLoading={isPending}>
              <>
                Continue to screening
                <ArrowRightIcon className="size-4 ml-1.5" />
              </>
            </LoadingSwap>
          </Button>

          <p className="text-center text-xs text-muted-foreground leading-relaxed">
            By continuing you agree to our{" "}
            <a href="/legal/terms" className="underline hover:text-foreground transition-colors">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/legal/privacy" className="underline hover:text-foreground transition-colors">
              Privacy Policy
            </a>
            .
          </p>
        </div>

      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ScreeningCandidateClient({
  token,
  screening,
  candidate,
  inviteEmail,
  locale,
  showIdentityStep = false,
}: Props) {
  const { authUser, setNotFoundHandler, setEmailTakenHandler, setSuccessHandler } = useAuth();
  const router = useRouter();
  const prevAuthUser = useRef(authUser);

  // When the user transitions from unauthenticated → authenticated, refresh
  // the server component so it can fetch the candidate row and route accordingly.
  useEffect(() => {
    if (authUser && !prevAuthUser.current) {
      router.refresh();
    }
    prevAuthUser.current = authUser;
  }, [authUser, router]);

  // While the auth gate is visible, intercept auth-provider navigation so that
  // error outcomes flip views instead of navigating away and losing context.
  useEffect(() => {
    if (candidate) return;
    setNotFoundHandler(() => {}); // no-op — magic link always creates the user
    setEmailTakenHandler(() => {}); // no-op
    // Suppress provider-level navigation on success — router.refresh() handles it
    setSuccessHandler(() => {});
    return () => {
      setNotFoundHandler(null);
      setEmailTakenHandler(null);
      setSuccessHandler(null);
    };
  }, [candidate, setNotFoundHandler, setEmailTakenHandler, setSuccessHandler]);

  // Not yet authenticated — show the appropriate gate
  if (!candidate) {
    return (
      <CandidateAccessGate
        token={token}
        screening={screening}
        inviteEmail={inviteEmail}
      />
    );
  }

  const { stage } = candidate;

  if (stage === "details") {
    return (
      <DetailsStep
        screening={screening}
        candidate={candidate}
        onComplete={() => router.refresh()}
      />
    );
  }

  if (stage === "interview") {
    if (showIdentityStep) {
      return (
        <IdentityStep
          screening={screening}
          candidate={candidate}
          token={token}
          onVerified={() => router.refresh()}
        />
      );
    }
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-sm text-muted-foreground">Redirecting to your interview…</p>
      </div>
    );
  }

  return <CompletedStep screening={screening} candidate={candidate} />;
}
