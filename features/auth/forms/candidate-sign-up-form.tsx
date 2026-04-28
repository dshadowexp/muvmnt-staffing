"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { z } from "zod";
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
import { Password } from "@/features/auth/components/password-input";
import {
  ErrorBanner,
  OrDivider,
  AuthLegalNote,
} from "@/features/auth/components/auth-primitives";
import { getAuthErrorKey, signUpWithEmail } from "@/services/firebase/auth";
import { checkCandidateInviteAction } from "@/features/auth/actions";
import posthog from "posthog-js";

// ─── Component ────────────────────────────────────────────────────────────────

type CandidateSignUpFormProps = {
  onSuccess?: () => void;
  showFooterLink?: boolean;
};

export function CandidateSignUpForm({
  onSuccess,
  showFooterLink = true,
}: CandidateSignUpFormProps) {
  const { loading: authLoading, setPendingRole } = useAuth();
  const { withAuthParams } = useAuthRedirect();
  const t = useTranslations("auth.signUp");
  const tValidation = useTranslations("auth.validation");
  const tErrors = useTranslations("auth.errors");

  // Track invite check results to avoid redundant server round-trips
  const [inviteChecked, setInviteChecked] = useState<Map<string, boolean>>(new Map());

  const schema = useMemo(
    () =>
      z.object({
        firstName: z.string().min(1, tValidation("firstNameRequired")),
        lastName: z.string().min(1, tValidation("lastNameRequired")),
        email: z.string().email(tValidation("emailInvalid")),
        password: z
          .string()
          .min(8, tValidation("passwordMin"))
          .refine((p) => p.length >= 9, tValidation("passwordLength"))
          .refine((p) => /[A-Z]/.test(p), tValidation("passwordUpper"))
          .refine((p) => /[0-9]/.test(p), tValidation("passwordNumber"))
          .refine(
            (p) => /[^A-Za-z0-9]/.test(p),
            tValidation("passwordSpecial"),
          ),
      }),
    [tValidation],
  );
  type CandidateSignUpValues = z.infer<typeof schema>;

  const form = useForm<CandidateSignUpValues>({
    defaultValues: { firstName: "", lastName: "", email: "", password: "" },
    resolver: zodResolver(schema) as Resolver<CandidateSignUpValues>,
  });

  const {
    register,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const password = watch("password");
  const isLoading = isSubmitting || authLoading;

  useEffect(() => {
    setPendingRole("candidate");
  }, [setPendingRole]);

  /** Validate the invite on blur — gives instant feedback before submit. */
  async function handleEmailBlur(email: string) {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;
    if (inviteChecked.has(trimmed)) {
      // Already checked — apply cached result
      if (!inviteChecked.get(trimmed)) {
        form.setError("email", { message: tValidation("inviteNotFound") });
      }
      return;
    }
    const { valid } = await checkCandidateInviteAction(trimmed);
    setInviteChecked((prev) => new Map(prev).set(trimmed, valid));
    if (!valid) {
      form.setError("email", { message: tValidation("inviteNotFound") });
    } else {
      form.clearErrors("email");
    }
  }

  async function handleSubmit(data: CandidateSignUpValues) {
    const trimmedEmail = data.email.trim().toLowerCase();

    // Ensure invite is valid — check from cache first, then server
    let valid = inviteChecked.get(trimmedEmail);
    if (valid === undefined) {
      const result = await checkCandidateInviteAction(trimmedEmail);
      valid = result.valid;
      setInviteChecked((prev) => new Map(prev).set(trimmedEmail, valid!));
    }
    if (!valid) {
      form.setError("email", { message: tValidation("inviteNotFound") });
      return;
    }

    try {
      const displayName = `${data.firstName.trim()} ${data.lastName.trim()}`;
      await signUpWithEmail(trimmedEmail, data.password, displayName);
      posthog.identify(trimmedEmail, {
        email: trimmedEmail,
        role: "candidate",
        name: displayName,
      });
      posthog.capture("user_signed_up", { method: "email", role: "candidate" });
      onSuccess?.();
    } catch (err) {
      const key = getAuthErrorKey(err);
      form.setError("root", { message: key ? tErrors(key) : "" });
      posthog.captureException(err);
    }
  }

  return (
    <>
      <div className="mb-7 w-full max-w-[440px] text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[1.5px] text-primary">
          {t("overline")}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{t("titleCandidate")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {t("subtitleCandidate")}
        </p>
      </div>

      <Card className="w-full max-w-[440px] overflow-hidden rounded-2xl shadow-lg">
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
                  <FieldLabel htmlFor="candidate-first-name">
                    {t("firstNameLabel")} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="candidate-first-name"
                    type="text"
                    placeholder={t("firstNamePlaceholder")}
                    autoComplete="given-name"
                    disabled={isLoading}
                    aria-invalid={!!errors.firstName || undefined}
                    {...register("firstName")}
                  />
                  <FieldError>{errors.firstName?.message}</FieldError>
                </Field>

                <Field data-invalid={!!errors.lastName}>
                  <FieldLabel htmlFor="candidate-last-name">
                    {t("lastNameLabel")} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="candidate-last-name"
                    type="text"
                    placeholder={t("lastNamePlaceholder")}
                    autoComplete="family-name"
                    disabled={isLoading}
                    aria-invalid={!!errors.lastName || undefined}
                    {...register("lastName")}
                  />
                  <FieldError>{errors.lastName?.message}</FieldError>
                </Field>
              </div>

              {/* Invite email */}
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="candidate-email">
                  {t("inviteEmailLabel")} <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="candidate-email"
                  type="email"
                  placeholder={t("inviteEmailPlaceholder")}
                  autoComplete="email"
                  disabled={isLoading}
                  aria-invalid={!!errors.email || undefined}
                  {...register("email", {
                    onBlur: (e) => handleEmailBlur(e.target.value),
                  })}
                />
                <FieldError>{errors.email?.message}</FieldError>
                {!errors.email && (
                  <p className="mt-0.5 text-[0.72rem] text-muted-foreground">
                    {t("inviteEmailNote")}
                  </p>
                )}
              </Field>

              {/* Password */}
              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="candidate-password">
                  {t("passwordLabel")} <span className="text-destructive">*</span>
                </FieldLabel>
                <Password
                  id="candidate-password"
                  placeholder={t("passwordPlaceholder")}
                  autoComplete="new-password"
                  disabled={isLoading}
                  aria-invalid={!!errors.password || undefined}
                  password={password}
                  error={errors.password?.message}
                  showStrength
                  {...register("password")}
                />
              </Field>

              <Button
                type="submit"
                size="lg"
                disabled={isLoading}
                className="mt-0.5 w-full"
              >
                <LoadingSwap isLoading={isSubmitting}>
                  <span>{t("submit")}</span>
                </LoadingSwap>
              </Button>
            </form>

            <OrDivider />
            <GoogleButton />

            <AuthLegalNote />

            {showFooterLink && (
              <p className="text-center text-[0.82rem] font-light text-muted-foreground">
                {t("haveAccount")}{" "}
                <Link
                  href={withAuthParams("/sign-in")}
                  className="font-semibold text-primary no-underline transition-colors hover:text-primary/80"
                >
                  {t("signIn")}
                </Link>
              </p>
            )}
          </FieldGroup>
        </CardContent>
      </Card>
    </>
  );
}
