"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { useTranslations } from "next-intl";
import { auth } from "@/services/firebase/auth";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { Check, CircleDashed } from "lucide-react";
import posthog from "posthog-js";
import { env } from "@/data/env/client";

const POLL_INTERVAL_MS = 4000;
const COOLDOWN_SECONDS = 60;

export function EmailVerification() {
  const { firebaseUser: user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const t = useTranslations("kyc.onboarding.forms.verification");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleVerified = useCallback(() => {
    if (!mountedRef.current) return;
    posthog.capture("email_verified");
    router.refresh();
  }, [router]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    const id = setInterval(async () => {
      if (!auth.currentUser) return;
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        clearInterval(id);
        if (mountedRef.current) pollRef.current = null;
        handleVerified();
      }
    }, POLL_INTERVAL_MS);
    pollRef.current = id;
  }, [handleVerified]);

  const startCooldown = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
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
      await sendEmailVerification(auth.currentUser, {
        url: `${env.NEXT_PUBLIC_APP_URL}/onboarding/verification`,
      });
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

  const handleCheckAgain = useCallback(async () => {
    if (!auth.currentUser) return;
    setChecking(true);
    setError("");
    try {
      stopPolling();
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        handleVerified();
      } else {
        startPolling();
      }
    } catch {
      setError(t("emailSendFailed"));
    } finally {
      if (mountedRef.current) setChecking(false);
    }
  }, [handleVerified, startPolling, stopPolling, t]);

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
          <CircleDashed className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
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

                {sent ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    disabled={checking}
                    onClick={handleCheckAgain}
                  >
                    <LoadingSwap isLoading={checking}>
                      <span>{t("checkAgain")}</span>
                    </LoadingSwap>
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
