"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { SignUpForm } from "@/features/auth/forms/sign-up-form";
import { SignInForm } from "@/features/auth/forms/sign-in-form";
import { useState } from "react";
import type { ScreeningRow, ScreeningCandidateRow } from "@/features/screenings/dal/queries";
import { DetailsStep } from "./_steps/details";
import { CompletedStep } from "./_steps/completed";

type Props = {
  token: string;
  screening: ScreeningRow;
  candidate: ScreeningCandidateRow | null;
  isWorkerInvite: boolean;
  locale: string;
};

export function ScreeningCandidateClient({
  token,
  screening,
  candidate,
  isWorkerInvite,
  locale,
}: Props) {
  const { authUser } = useAuth();
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
              <SignUpForm role="candidate" />
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
              <SignInForm />
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

  // "interview" stage is handled server-side: the page redirects to /interviews/[id].
  // If we somehow render here in that stage, show a loading spinner while the
  // server redirect resolves (or the user can refresh manually).
  if (stage === "interview") {
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
