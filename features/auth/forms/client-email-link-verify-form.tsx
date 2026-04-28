"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { CircleDashedIcon, MailXIcon } from "lucide-react";
import { useAuth } from "@/features/auth/providers/auth-provider";
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
import { ErrorBanner } from "@/features/auth/components/auth-primitives";
import {
  getAuthErrorKey,
  isEmailSignInLink,
  signInWithMagicLink,
  EMAIL_LINK_LS_EMAIL,
  EMAIL_LINK_LS_NAME,
} from "@/services/firebase/auth";
import posthog from "posthog-js";

// ─── Component ────────────────────────────────────────────────────────────────

type VerifyStep = "verifying" | "prompt-email" | "invalid";

export function ClientEmailLinkVerifyForm() {
  const { setPendingRole } = useAuth();
  const t = useTranslations("auth.verify");
  const tValidation = useTranslations("auth.validation");
  const tErrors = useTranslations("auth.errors");

  const [verifyStep, setVerifyStep] = useState<VerifyStep>("verifying");

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(tValidation("emailInvalid")),
      }),
    [tValidation],
  );
  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    defaultValues: { email: "" },
    resolver: zodResolver(schema) as Resolver<FormValues>,
  });

  const { register, formState: { errors, isSubmitting } } = form;

  // Attempt auto sign-in on mount when email is in localStorage
  useEffect(() => {
    setPendingRole("client");

    if (!isEmailSignInLink(window.location.href)) {
      setVerifyStep("invalid");
      return;
    }

    const storedEmail = localStorage.getItem(EMAIL_LINK_LS_EMAIL);
    if (!storedEmail) {
      // Link opened on a different device — ask user to enter their email
      setVerifyStep("prompt-email");
      return;
    }

    const storedName = localStorage.getItem(EMAIL_LINK_LS_NAME) ?? undefined;
    completeSignIn(storedEmail, storedName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function completeSignIn(email: string, displayName?: string) {
    try {
      await signInWithMagicLink(email, displayName);
      // Clean up localStorage — the auth provider's onAuthStateChanged takes it from here
      localStorage.removeItem(EMAIL_LINK_LS_EMAIL);
      localStorage.removeItem(EMAIL_LINK_LS_NAME);
      posthog.capture("user_signed_up", { method: "email_link", role: "client" });
      posthog.identify(email, { email, role: "client" });
    } catch (err) {
      const key = getAuthErrorKey(err);
      form.setError("root", { message: key ? tErrors(key) : "" });
      posthog.captureException(err);
      setVerifyStep("prompt-email");
    }
  }

  async function handleEmailSubmit(data: FormValues) {
    const storedName = localStorage.getItem(EMAIL_LINK_LS_NAME) ?? undefined;
    await completeSignIn(data.email.trim().toLowerCase(), storedName);
  }

  // ── Invalid link ───────────────────────────────────────────────────────────
  if (verifyStep === "invalid") {
    return (
      <>
        <div className="mb-7 w-full max-w-[440px] text-center">
          <h1 className="text-2xl font-bold tracking-tight">{t("invalidLinkTitle")}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("invalidLinkSubtitle")}</p>
        </div>

        <Card className="w-full max-w-[440px] overflow-hidden">
          <CardContent className="px-9 pb-8 pt-7">
            <FieldGroup>
              <div className="flex justify-center py-2">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
                  <MailXIcon className="size-7 text-destructive" />
                </div>
              </div>
              <Link
                href="/sign-up/client"
                className="block w-full rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-center text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                {t("backToSignUp")}
              </Link>
            </FieldGroup>
          </CardContent>
        </Card>
      </>
    );
  }

  // ── Verifying (auto sign-in in progress) ──────────────────────────────────
  if (verifyStep === "verifying") {
    return (
      <>
        <div className="mb-7 w-full max-w-[440px] text-center">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <Card className="w-full max-w-[440px] overflow-hidden">
          <CardContent className="flex items-center justify-center px-9 pb-8 pt-7">
            <CircleDashedIcon className="size-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </>
    );
  }

  // ── Cross-device: prompt for email ─────────────────────────────────────────
  return (
    <>
      <div className="mb-7 w-full max-w-[440px] text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[1.5px] text-primary">
          {t("overline")}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{t("emailPromptTitle")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("emailPromptSubtitle")}</p>
      </div>

      <Card className="w-full max-w-[440px] overflow-hidden">
        <CardContent className="px-9 pb-8 pt-7">
          <FieldGroup>
            <form
              onSubmit={form.handleSubmit(handleEmailSubmit)}
              className="contents"
            >
              <ErrorBanner message={errors.root?.message ?? ""} />

              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="verify-email">
                  {t("emailLabel")} <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="verify-email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  autoComplete="email"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.email || undefined}
                  {...register("email")}
                />
                <FieldError>{errors.email?.message}</FieldError>
              </Field>

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="mt-0.5 w-full"
              >
                <LoadingSwap isLoading={isSubmitting}>
                  <span>{t("submit")}</span>
                </LoadingSwap>
              </Button>
            </form>

            <p className="text-center text-[0.82rem] font-light text-muted-foreground">
              <Link
                href="/sign-up/client"
                className="font-semibold text-primary transition-colors hover:text-primary/80"
              >
                {t("backToSignUp")}
              </Link>
            </p>
          </FieldGroup>
        </CardContent>
      </Card>
    </>
  );
}
