"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { SignUpForm } from "@/features/auth/forms/sign-up-form";
import { SignInForm } from "@/features/auth/forms/sign-in-form";
import { useState } from "react";
import type { ScreeningRow, ScreeningCandidateRow } from "@/features/screenings/dal/queries";
import { DetailsStep } from "./_steps/details";
import { IdentityStep } from "./_steps/identity";
import { CompletedStep } from "./_steps/completed";

type Props = {
  token: string;
  screening: ScreeningRow;
  candidate: ScreeningCandidateRow | null;
  isWorkerInvite: boolean;
  locale: string;
  showIdentityStep?: boolean;
};

export function ScreeningCandidateClient({
  token,
  screening,
  candidate,
  isWorkerInvite,
  locale,
  showIdentityStep = false,
}: Props) {
  const { authUser, setNotFoundHandler, setEmailTakenHandler, setSuccessHandler } = useAuth();
  const router = useRouter();
  const prevAuthUser = useRef(authUser);
  // Workers already have an account — default straight to sign-in and hide sign-up
  const [authView, setAuthView] = useState<"signup" | "signin">(
    isWorkerInvite ? "signin" : "signup"
  );

  // When the user transitions from unauthenticated to authenticated, refresh
  // the server page so it can fetch the candidate row and route accordingly.
  useEffect(() => {
    if (authUser && !prevAuthUser.current) {
      router.refresh();
    }
    prevAuthUser.current = authUser;
  }, [authUser, router]);

  // While the auth gate is visible, intercept auth-provider navigation so that
  // error outcomes (no Supabase row, email taken) flip the view instead of
  // navigating away from the portal and losing the screening context.
  useEffect(() => {
    if (candidate) return;
    setNotFoundHandler(() => setAuthView("signup"));
    setEmailTakenHandler(() => setAuthView("signin"));
    // Suppress provider-level navigation on success — router.refresh() via
    // the authUser effect above handles re-rendering the server component.
    setSuccessHandler(() => {});
    return () => {
      setNotFoundHandler(null);
      setEmailTakenHandler(null);
      setSuccessHandler(null);
    };
  }, [candidate, setNotFoundHandler, setEmailTakenHandler, setSuccessHandler]);

  // Not authenticated — show auth gate
  if (!candidate) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center p-4">
        <div className="w-full max-w-[440px] space-y-4">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold">{screening.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isWorkerInvite
                ? "Sign in with your ReadyKare account to continue."
                : "Create an account to start your screening."}
            </p>
          </div>

          {authView === "signup" ? (
            <>
              <SignUpForm
                role="candidate"
                onSuccess={() => {/* auth effect handles router.refresh() */}}
                showGoogle={false}
                showFooterLink={false}
              />
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  className="underline hover:text-foreground"
                  onClick={() => setAuthView("signin")}
                >
                  Sign in
                </button>
              </p>
            </>
          ) : (
            <>
              <SignInForm
                onSuccess={() => {/* auth effect handles router.refresh() */}}
                showGoogle={false}
                showFooterLink={false}
              />
              {/* Workers are always existing users — no sign-up path */}
              {!isWorkerInvite && (
                <p className="text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    className="underline hover:text-foreground"
                    onClick={() => setAuthView("signup")}
                  >
                    Sign up
                  </button>
                </p>
              )}
            </>
          )}
        </div>
      </div>
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

  // "interview" stage: identity verification gate (if required) or redirect.
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
    // Server-side redirect handles the interview navigation; show a spinner
    // while it resolves (or if the user lands here mid-redirect).
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">Redirecting to your interview…</p>
        </div>
      </div>
    );
  }

  // completed
  return <CompletedStep screening={screening} candidate={candidate} />;
}
