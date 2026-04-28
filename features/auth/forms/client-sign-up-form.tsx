"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { MailCheckIcon } from "lucide-react";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useAuthRedirect } from "@/features/auth/hooks/use-auth-redirect";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { GoogleButton } from "@/features/auth/components/google-button";
import {
  ErrorBanner,
  OrDivider,
  AuthLegalNote,
} from "@/features/auth/components/auth-primitives";
import {
  getAuthErrorKey,
  sendMagicLink,
  EMAIL_LINK_LS_EMAIL,
  EMAIL_LINK_LS_NAME,
} from "@/services/firebase/auth";
import { env } from "@/data/env/client";
import posthog from "posthog-js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true when the email domain belongs to a known personal provider. */
function isPersonalEmailDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  const PERSONAL_DOMAINS = new Set([
    "gmail.com", "googlemail.com",
    "yahoo.com", "yahoo.co.uk", "yahoo.ca", "yahoo.co.in",
    "hotmail.com", "hotmail.ca", "hotmail.co.uk",
    "outlook.com", "outlook.ca", "outlook.co.uk",
    "live.com", "live.ca", "live.co.uk",
    "icloud.com", "me.com", "mac.com",
    "aol.com", "protonmail.com", "proton.me", "pm.me",
    "tutanota.com", "tutanota.de",
    "zoho.com", "yandex.com", "yandex.ru",
    "mail.com", "fastmail.com", "fastmail.fm",
    "hey.com", "msn.com",
  ]);
  return PERSONAL_DOMAINS.has(domain);
}

// ─── Component ────────────────────────────────────────────────────────────────

type ClientSignUpFormProps = {
  showFooterLink?: boolean;
};

type Step = "form" | "sent";

export function ClientSignUpForm({
  showFooterLink = true,
}: ClientSignUpFormProps) {
  const { setPendingRole } = useAuth();
  const { withAuthParams } = useAuthRedirect();
  const t = useTranslations("auth.signUp");
  const tValidation = useTranslations("auth.validation");
  const tErrors = useTranslations("auth.errors");

  const [step, setStep] = useState<Step>("form");
  const [sentEmail, setSentEmail] = useState("");

  const schema = useMemo(
    () =>
      z.object({
        firstName: z.string().min(1, tValidation("firstNameRequired")),
        lastName:  z.string().min(1, tValidation("lastNameRequired")),
        email: z
          .email(tValidation("emailInvalid"))
          // .refine(
          //   (e) => !isPersonalEmailDomain(e),
          //   tValidation("companyEmailPersonal"),
          // ),
      }),
    [tValidation],
  );
  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    defaultValues: { firstName: "", lastName: "", email: "" },
    resolver: zodResolver(schema) as Resolver<FormValues>,
  });

  const {
    register,
    formState: { errors, isSubmitting },
  } = form;

  useEffect(() => {
    setPendingRole("client");
  }, [setPendingRole]);

  async function handleSubmit(data: FormValues) {
    try {
      const displayName = `${data.firstName.trim()} ${data.lastName.trim()}`;
      const email = data.email.trim().toLowerCase();

      // Store for the verify page (Firebase requires it on the same device;
      // the verify page also handles cross-device fallback).
      localStorage.setItem(EMAIL_LINK_LS_EMAIL, email);
      localStorage.setItem(EMAIL_LINK_LS_NAME,  displayName);

      const continueUrl = `${env.NEXT_PUBLIC_APP_URL}/sign-up/client/verify`;
      await sendMagicLink(email, continueUrl);

      posthog.capture("magic_link_sent", { role: "client" });
      setSentEmail(email);
      setStep("sent");
    } catch (err) {
      const key = getAuthErrorKey(err);
      form.setError("root", { message: key ? tErrors(key) : "" });
      posthog.captureException(err);
    }
  }

  async function handleResend() {
    const email = sentEmail;
    if (!email) return;
    try {
      const continueUrl = `${env.NEXT_PUBLIC_APP_URL}/sign-up/client/verify`;
      await sendMagicLink(email, continueUrl);
      posthog.capture("magic_link_resent", { role: "client" });
    } catch (err) {
      posthog.captureException(err);
    }
  }

  // ── Sent confirmation ──────────────────────────────────────────────────────
  if (step === "sent") {
    return (
      <>
        <div className="mb-7 w-full max-w-[440px] text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[1.5px] text-primary">
            {t("overline")}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("magicLinkSentTitle")}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {t("magicLinkSentSubtitle", { email: sentEmail })}
          </p>
        </div>

        <Card className="w-full max-w-[440px] overflow-hidden">
          <CardContent className="px-9 pb-8 pt-7">
            <FieldGroup>
              {/* Envelope illustration */}
              <div className="flex justify-center pb-2 pt-1">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                  <MailCheckIcon className="size-7 text-primary" />
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                {t("magicLinkResendLabel")}{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  className="font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  {t("magicLinkResend")}
                </button>
              </p>

              <div className="h-px bg-border" />

              <p className="text-center text-[0.82rem] font-light text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  {t("magicLinkChangeEmail")}
                </button>
              </p>
            </FieldGroup>
          </CardContent>
        </Card>
      </>
    );
  }

  // ── Step 1: collect name + email ───────────────────────────────────────────
  return (
    <>
      <div className="mb-7 w-full max-w-[440px] text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[1.5px] text-primary">
          {t("overline")}
        </p>
        {/* <h1 className="text-2xl font-bold tracking-tight">{t("titleClient")}</h1> */}
        <p className="mt-1.5 text-sm text-muted-foreground">
          {t("subtitleClient")}
        </p>
      </div>

      <Card className="w-full max-w-[440px] overflow-hidden">
        <CardContent className="px-9 pb-8 pt-7">
          <FieldGroup>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="contents"
            >
              <ErrorBanner message={errors.root?.message ?? ""} />

              {/* First + Last name — side by side */}
              <div className="grid grid-cols-2 gap-3">
                <Field data-invalid={!!errors.firstName}>
                  <FieldLabel htmlFor="client-first-name">
                    {t("firstNameLabel")} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="client-first-name"
                    type="text"
                    placeholder={t("firstNamePlaceholder")}
                    autoComplete="given-name"
                    disabled={isSubmitting}
                    aria-invalid={!!errors.firstName || undefined}
                    {...register("firstName")}
                  />
                  <FieldError>{errors.firstName?.message}</FieldError>
                </Field>

                <Field data-invalid={!!errors.lastName}>
                  <FieldLabel htmlFor="client-last-name">
                    {t("lastNameLabel")} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="client-last-name"
                    type="text"
                    placeholder={t("lastNamePlaceholder")}
                    autoComplete="family-name"
                    disabled={isSubmitting}
                    aria-invalid={!!errors.lastName || undefined}
                    {...register("lastName")}
                  />
                  <FieldError>{errors.lastName?.message}</FieldError>
                </Field>
              </div>

              {/* Company email */}
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="client-email">
                  {t("companyEmailLabel")} <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="client-email"
                  type="email"
                  placeholder={t("companyEmailPlaceholder")}
                  autoComplete="email"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.email || undefined}
                  {...register("email")}
                />
                <FieldError className="text-[0.75rem]">{errors.email?.message}</FieldError>
                {!errors.email && (
                  <p className="mt-0.5 text-[0.75rem] text-muted-foreground">
                    {t("companyEmailNote")}
                  </p>
                )}
              </Field>

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="mt-0.5 w-full"
              >
                <LoadingSwap isLoading={isSubmitting}>
                  <span>{t("submitMagicLink")}</span>
                </LoadingSwap>
              </Button>
            </form>
            <OrDivider />
            <GoogleButton text={t("google")} />

            <AuthLegalNote />

            {showFooterLink && (
              <p className="text-center text-[0.82rem] font-light text-muted-foreground">
                {t("lookingForWork")}{" "}
                <Link
                  href={withAuthParams("/sign-up/worker")}
                  className="font-semibold text-primary no-underline transition-colors hover:text-primary/80"
                >
                  {t("joinOurNetwork")}
                </Link>
              </p>
            )}
          </FieldGroup>
        </CardContent>
      </Card>
    </>
  );
}
