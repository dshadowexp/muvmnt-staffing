"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/providers/auth-provider";
import { sendPhoneOtp, verifyPhoneOtp } from "@/features/verification/dal/queries";
import {
  phoneSchema,
  otpSchema,
} from "@/features/verification/schemas";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { Check, Loader2 } from "lucide-react";
import { formatPhoneToE164 } from "@/lib/formatters";

type PhoneStep = "input" | "otp" | "done";

type FormValues = {
  phone: string;
  code: string;
};

export function PhoneVerification() {
  const { firebaseUser: user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<PhoneStep>("input");
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const form = useForm<FormValues>({
    defaultValues: { phone: "", code: "" },
  });

  const { register, setValue, watch, setError, clearErrors, formState } = form;
  const { errors } = formState;
  const phone = watch("phone");
  const code = watch("code");

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(60);
    timerRef.current = setInterval(() => {
      setCooldown((n) => {
        if (n <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return n - 1;
      });
    }, 1000);
  };

  const reset = () => {
    form.setValue("code", "");
    clearErrors();
    setStep("input");
  };

  const handleSend = async () => {
    clearErrors();
    const result = phoneSchema.safeParse(phone.trim());
    if (!result.success) {
      setError("phone", { message: result.error.issues[0]?.message ?? "Invalid phone" });
      return;
    }

    setSending(true);
    try {
      const formatted = formatPhoneToE164(phone);
      await sendPhoneOtp(formatted);
      setStep("otp");
      startCooldown();
    } catch (e) {
      setError("phone", {
        message: e instanceof Error ? e.message : "Couldn't send the code. Check the number and try again.",
      });
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    clearErrors();
    const result = otpSchema.safeParse(code);
    if (!result.success) {
      setError("code", { message: result.error.issues[0]?.message ?? "Invalid code" });
      return;
    }

    setVerifying(true);
    try {
      const formatted = formatPhoneToE164(phone);
      const res = await verifyPhoneOtp(formatted, code);
      if (res.status === "approved") {
        setVerifiedPhone(formatted);
        setStep("done");
      } else {
        setError("code", { message: "Verification failed. Please try again." });
      }
    } catch (e) {
      setError("code", {
        message: e instanceof Error ? e.message : "Verification failed. Please try again.",
      });
    } finally {
      setVerifying(false);
    }
  };

  const done = step === "done";
  const isVerified = done || !!user?.phoneNumber;

  return (
    <section className="space-y-3" aria-labelledby="phone-verification-heading">
      <div className="flex items-center justify-between gap-2">
        <FieldLabel id="phone-verification-heading" className="font-semibold">
          Phone
        </FieldLabel>
        {!authLoading && isVerified ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
            <Check className="size-4" aria-hidden />
            Verified
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
      ) : isVerified ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {verifiedPhone ?? user?.phoneNumber ?? "Number confirmed"}
        </p>
      ) : step === "input" ? (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            We&apos;ll send a 6-digit SMS code to your Canadian number.
          </p>

          <Field data-invalid={!!errors.phone} className="w-full max-w-full gap-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="w-full flex-1 sm:max-w-[240px]">
                <Input
                  id="phone"
                  type="tel"
                  placeholder="416 555 0123"
                  {...register("phone", {
                    onChange: () => clearErrors("phone"),
                  })}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
              </div>
              <Button
                type="button"
                className="shrink-0 sm:mt-0"
                onClick={handleSend}
                disabled={sending || !phone.trim()}
              >
                <LoadingSwap isLoading={sending}>
                  <span>{sending ? "Sending…" : "Send code"}</span>
                </LoadingSwap>
              </Button>
            </div>
            <FieldError>{errors.phone?.message}</FieldError>
          </Field>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Enter the code sent to{" "}
            <span className="font-medium text-foreground">{phone}</span>
          </p>

          <div className="flex flex-col gap-4">
            <Field data-invalid={!!errors.code} className="max-w-[180px]">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(v) => {
                  setValue("code", v, { shouldValidate: true });
                  clearErrors("code");
                }}
              >
                <InputOTPGroup className="w-full justify-start">
                  {[...Array(6)].map((_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <FieldError>{errors.code?.message}</FieldError>
            </Field>
            <Button
              type="button"
              onClick={handleVerify}
              disabled={verifying || code.length < 6}
            >
              <LoadingSwap isLoading={verifying}>
                <span>{verifying ? "Verifying…" : "Confirm"}</span>
              </LoadingSwap>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="sm" type="button" onClick={reset}>
              Change number
            </Button>
            {cooldown > 0 ? (
              <span className="text-sm text-muted-foreground">
                Resend in {cooldown}s
              </span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={handleSend}
                disabled={sending}
              >
                Resend code
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
