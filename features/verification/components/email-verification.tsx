"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { useTranslations } from "next-intl";
import { auth } from "@/services/firebase/client";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { Check, Loader2 } from "lucide-react";
import posthog from "posthog-js";

const POLL_INTERVAL_MS = 4000;
const COOLDOWN_SECONDS = 60;

export function EmailVerification() {
  const { firebaseUser: user, loading: authLoading } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const t = useTranslations("kyc.onboarding.forms.verification");

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    const id = setInterval(async () => {
      if (!auth.currentUser) return;
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        clearInterval(id);
        pollRef.current = null;
        posthog.capture("email_verified");
      }
    }, POLL_INTERVAL_MS);
    pollRef.current = id;
  }, []);

  const startCooldown = useCallback(() => {
    setCooldown(COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCooldown((n) => {
        if (n <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return n - 1;
      });
    }, 1000);
  }, []);

  const handleSend = useCallback(async () => {
    if (!auth.currentUser) return;
    setSending(true);
    setError("");
    try {
      await sendEmailVerification(auth.currentUser);
      posthog.capture("email_verification_sent");
      setSent(true);
      startCooldown();
      startPolling();
    } catch {
      setError(t("emailSendFailed"));
    } finally {
      setSending(false);
    }
  }, [startCooldown, startPolling, t]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const disabled = sending || cooldown > 0;
  const needsVerification = !user?.emailVerified;

  return (
    <section className="space-y-3" aria-labelledby="email-verification-heading">
      <div className="flex items-center justify-between gap-2">
        <FieldLabel id="email-verification-heading" className="font-semibold">
          {t("emailLabel")}
        </FieldLabel>
        {!authLoading && user?.emailVerified ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
            <Check className="size-4" aria-hidden />
            {t("verifiedBadge")}
          </span>
        ) : null}
      </div>

      {authLoading ? (
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {user?.email ?? ""}
          </p>

          {needsVerification ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
              <div className="min-w-0 flex-1 space-y-3">
                {error ? (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}

                {sent ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t("emailCheckInbox")}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-wrap items-start gap-3 sm:flex-col sm:items-stretch">
                <Button
                  type="button"
                  onClick={handleSend}
                  disabled={disabled}
                >
                  <LoadingSwap isLoading={sending}>
                    <span>
                      {sending
                        ? t("sending")
                        : sent
                          ? cooldown > 0
                            ? t("resendIn", { seconds: cooldown })
                            : t("resend")
                          : t("sendEmail")}
                    </span>
                  </LoadingSwap>
                </Button>

                {sent && !user?.emailVerified ? (
                  <Button variant="ghost" size="sm" type="button" onClick={startPolling}>
                    {t("checkAgain")}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
