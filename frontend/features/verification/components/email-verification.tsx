"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "@/services/firebase/client";
import { useAuth } from "@/features/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { Check, Loader2 } from "lucide-react";

const POLL_INTERVAL_MS = 4000;
const COOLDOWN_SECONDS = 60;

export function EmailSection() {
  const { firebaseUser: user, loading: authLoading } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    const id = setInterval(async () => {
      if (!auth.currentUser) return;
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        clearInterval(id);
        pollRef.current = null;
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
      setSent(true);
      startCooldown();
      startPolling();
    } catch {
      setError("Couldn't send the email. Please try again.");
    } finally {
      setSending(false);
    }
  }, [startCooldown, startPolling]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const disabled = sending || cooldown > 0;
  const showActions = !authLoading && !user?.emailVerified;

  return (
    <div className="space-y-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <FieldLabel className="font-semibold">Email</FieldLabel>
        {authLoading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (
          user?.emailVerified && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold">
              <Check className="size-4" />
              Verified
            </span>
          )
        )}
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        {user?.email ?? ""}
      </p>

      {showActions && (
        <div className="space-y-4">
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {sent && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Check your inbox and click the link — this page updates
              automatically.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <Button
              type="button"
              onClick={handleSend}
              disabled={disabled}
            >
              <LoadingSwap isLoading={sending}>
                <span>
                  {sending
                    ? "Sending…"
                    : sent
                      ? cooldown > 0
                        ? `Resend in ${cooldown}s`
                        : "Resend"
                      : "Send link"}
                </span>
              </LoadingSwap>
            </Button>

            {sent && !user?.emailVerified && (
              <Button variant="ghost" size="sm" onClick={startPolling}>
                Check again
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
