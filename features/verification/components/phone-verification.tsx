"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useRouter } from "@/i18n/navigation";
import {
  buildPhoneSchema,
  buildOtpSchema,
  type PhoneCountry,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, CircleDashed } from "lucide-react";
import { formatPhoneToE164 } from "@/lib/formatters";
import posthog from "posthog-js";
import { ConfirmationResult, linkWithCredential, PhoneAuthProvider, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth, getAuthErrorKey } from "@/services/firebase/auth";

type PhoneStep = "input" | "otp" | "done";

type FormValues = {
  phone: string;
  code: string;
};

const COUNTRIES: ReadonlyArray<{
  code: PhoneCountry;
  dialCode: string;
  flag: string;
  label: string;
}> = [
  { code: "CA", dialCode: "+1", flag: "🇨🇦", label: "Canada" },
  { code: "US", dialCode: "+1", flag: "🇺🇸", label: "United States" },
  { code: "UK", dialCode: "+44", flag: "🇬🇧", label: "United Kingdom" },
];

export function PhoneVerification() {
  const { firebaseUser: user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<PhoneStep>("input");
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [country, setCountry] = useState<PhoneCountry>("CA");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const t = useTranslations("kyc.onboarding.forms.verification");
  const tVal = useTranslations("kyc.onboarding.validation");
  const tErrors = useTranslations("auth.errors");
  const phoneSchema = useMemo(
    () => buildPhoneSchema(tVal, country),
    [tVal, country],
  );
  const otpSchema = useMemo(() => buildOtpSchema(tVal), [tVal]);
  const selectedCountry = useMemo(
    () => COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0],
    [country],
  );

  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmationResult | null>(null);

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

  useEffect(() => {
    const recaptchaVerifier = new RecaptchaVerifier(
      auth, "recaptcha-container", {
      size: "invisible"
    });

    setRecaptchaVerifier(recaptchaVerifier);

    return () => {
      recaptchaVerifier.clear();
    };
  }, [auth]);

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
      setError("phone", {
        message: result.error.issues[0]?.message ?? tVal("phoneInvalid"),
      });
      return;
    }

    setSending(true);
    try {
      const formatted = formatPhoneToE164(phone, selectedCountry.dialCode);
      if (!recaptchaVerifier) {
        setError("phone", {
          message: "RecaptchaVerifier is not initialized",
        });
        return;
      }

      const confirmationResult = await signInWithPhoneNumber(auth, formatted, recaptchaVerifier);
      setConfirmResult(confirmationResult);

      posthog.capture("phone_otp_sent");
      setStep("otp");
      startCooldown();
    } catch (e) {
      const key = getAuthErrorKey(e);
      setError("phone", {
        message: key ? tErrors(key) : t("phoneSendFailed"),
      });
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (otp: string = code) => {
    clearErrors();
    const result = otpSchema.safeParse(otp);
    if (!result.success) {
      setError("code", {
        message: result.error.issues[0]?.message ?? tVal("codeLength"),
      });
      return;
    }

    if (!confirmResult) {
      setError("code", {
        message: "Please request OTP first",
      });
      return;
    }

    setVerifying(true);
    try {
      const credential = PhoneAuthProvider.credential(
        confirmResult.verificationId,
        otp
      );
      await linkWithCredential(auth.currentUser!, credential);

      const formatted = formatPhoneToE164(phone, selectedCountry.dialCode);
      posthog.capture("phone_verified");
      setVerifiedPhone(formatted);
      setStep("done");
      router.refresh();
      
    } catch (e) {
      const key = getAuthErrorKey(e);
      setError("code", {
        message: key ? tErrors(key) : t("verifyFailed"),
      });
    } finally {
      setVerifying(false);
    }
  };

  const done = step === "done";
  const isVerified = done || !!user?.phoneNumber;

  return (
    <section className="space-y-3" aria-labelledby="phone-verification-heading">
      <div id="recaptcha-container" />
      <div className="flex items-center justify-between gap-2">
        <FieldLabel id="phone-verification-heading" className="font-semibold">
          {t("phoneLabel")}
        </FieldLabel>
        {!authLoading && isVerified ? (
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
      ) : isVerified ? (
        <p className="text-sm text-muted-foreground">
          {verifiedPhone ?? user?.phoneNumber ?? t("numberConfirmed")}
        </p>
      ) : step === "input" ? (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("phoneIntro")}
          </p>

          <Field data-invalid={!!errors.phone} className="w-full max-w-full gap-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div
                className="flex w-full flex-1 items-stretch rounded-lg border border-input bg-input/30 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 aria-invalid:border-destructive sm:max-w-[280px]"
                aria-invalid={!!errors.phone}
              >
                <Select
                  value={country}
                  onValueChange={(v) => {
                    setCountry(v as PhoneCountry);
                    clearErrors("phone");
                  }}
                >
                  <SelectTrigger
                    aria-label={t("phoneLabel")}
                    className="h-9 shrink-0 rounded-r-none border-0 border-r border-input bg-transparent pl-3 pr-2 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent"
                  >
                    <SelectValue>
                      <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden>{selectedCountry.flag}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {selectedCountry.dialCode}
                        </span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start">
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="inline-flex items-center gap-2">
                          <span aria-hidden>{c.flag}</span>
                          <span>{c.label}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {c.dialCode}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder={t("phonePlaceholder")}
                  className="flex-1 rounded-l-none border-0 bg-transparent focus-visible:ring-0 focus-visible:border-0"
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
                  <span>{sending ? t("sending") : t("sendCode")}</span>
                </LoadingSwap>
              </Button>
            </div>
            <FieldError>{errors.phone?.message}</FieldError>
          </Field>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("otpSentPrefix")}
            <span className="font-medium text-foreground">
              {formatPhoneToE164(phone, selectedCountry.dialCode)}
            </span>
          </p>

          <Field data-invalid={!!errors.code} className="w-full max-w-full gap-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="w-full flex-1 sm:w-auto sm:flex-initial">
                <InputOTP
                  maxLength={6}
                  value={code}
                  disabled={verifying || !confirmResult}
                  onChange={(v) => {
                    setValue("code", v, { shouldValidate: true });
                    clearErrors("code");
                    if (v.length === 6 && !verifying) {
                      void handleVerify(v);
                    }
                  }}
                >
                  <InputOTPGroup className="justify-start">
                    {[...Array(6)].map((_, i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {verifying ? (
                <span
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground"
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <CircleDashed className="size-4 shrink-0 animate-spin" aria-hidden />
                  {t("verifying")}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={reset}
              disabled={verifying || authLoading}
            >
              {t("changeNumber")}
            </Button>
            {cooldown > 0 ? (
              <span className="text-sm text-muted-foreground">
                {t("resendIn", { seconds: cooldown })}
              </span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={handleSend}
                disabled={sending || verifying || authLoading}
              >
                {t("resendCode")}
              </Button>
            )}
          </div>
            <FieldError>{errors.code?.message}</FieldError>
          </Field>
        </div>
      )}
    </section>
  );
}
