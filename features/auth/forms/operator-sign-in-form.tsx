"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useAuthRedirect } from "@/features/auth/hooks/use-auth-redirect";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { MicrosoftButton } from "@/features/auth/components/microsoft-button";
import { Password } from "@/features/auth/components/password-input";
import {
  ErrorBanner,
  AuthLegalNote,
  OrDivider,
} from "@/features/auth/components/auth-primitives";
import { getAuthErrorKey, loginWithEmail } from "@/services/firebase/auth";
import posthog from "posthog-js";
import { checkFacilityOperatorSignInAction } from "@/features/auth/actions";
import { previewFacilityTeamInviteAction } from "@/features/account/actions/invite";
import { CANDIDATE_ROLE, OPERATOR_ROLE, STAFF_ROLE } from "../types";

type Step = "email" | "password";

export function OperatorSignInForm() {
  const { loading, setPendingRole, setPendingInviteToken } = useAuth();
  const inviteParams = useSearchParams();
  const { withAuthParams } = useAuthRedirect();

  const tFlow = useTranslations("auth.facilitySignIn.flow");
  const tNav = useTranslations("auth.facilitySignIn");
  const tSignUp = useTranslations("auth.signUp");
  const tWrongPanel = useTranslations("auth.facilitySignIn.panels.wrongRole");
  const tValidation = useTranslations("auth.validation");
  const tErrors = useTranslations("auth.errors");

  const [step, setStep] = useState<Step>("email");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const [domainBlock, setDomainBlock] = useState<{
    facilityName: string | null;
    domain: string;
  } | null>(null);

  const [invitePreview, setInvitePreview] = useState<
    Awaited<ReturnType<typeof previewFacilityTeamInviteAction>> | null
  >(null);

  const [wrongRoleHint, setWrongRoleHint] = useState<
    typeof STAFF_ROLE | typeof CANDIDATE_ROLE | null
  >(null);

  useEffect(() => {
    setPendingRole(OPERATOR_ROLE);
    const tok = inviteParams.get("invite_token")?.trim() ?? null;
    setPendingInviteToken(tok);
    if (!tok) {
      setInvitePreview(null);
      return;
    }
    void previewFacilityTeamInviteAction(tok).then(setInvitePreview);
  }, [inviteParams, setPendingInviteToken, setPendingRole]);

  const emailSchema = useMemo(
    () =>
      z.object({
        email: z.email(tValidation("emailInvalid")),
      }),
    [tValidation],
  );
  type EmailValues = z.infer<typeof emailSchema>;

  const passwordSchema = useMemo(
    () =>
      z.object({
        password: z.string().min(8, tValidation("passwordMin")),
      }),
    [tValidation],
  );
  type PasswordValues = z.infer<typeof passwordSchema>;

  const emailForm = useForm<EmailValues>({
    defaultValues: { email: "" },
    resolver: zodResolver(emailSchema) as Resolver<EmailValues>,
  });

  const passwordForm = useForm<PasswordValues>({
    defaultValues: { password: "" },
    resolver: zodResolver(passwordSchema) as Resolver<PasswordValues>,
  });

  const {
    watch,
    register: registerPassword,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword },
  } = passwordForm;

  const passwordValue = watch("password");

  useEffect(() => {
    if (invitePreview?.ok) {
      emailForm.setValue("email", invitePreview.email);
    }
  }, [invitePreview, emailForm]);

  const isBusyEmail = emailForm.formState.isSubmitting || loading;
  const isBusyPassword = isSubmittingPassword || loading;

  async function handleEmailSubmit(data: EmailValues) {
    const email = data.email.trim().toLowerCase();
    emailForm.clearErrors("root");
    setDomainBlock(null);
    setWrongRoleHint(null);

    if (invitePreview?.ok && email !== invitePreview.email.toLowerCase()) {
      emailForm.setError("email", { message: tSignUp("inviteEmailMismatch") });
      return;
    }

    try {
      const outcome = await checkFacilityOperatorSignInAction(email);

      switch (outcome.status) {
        case "password_allowed":
          setPendingEmail(email);
          setStep("password");
          passwordForm.reset({ password: "" });
          return;

        case "domain_registered":
          setDomainBlock({
            facilityName: outcome.facilityName,
            domain: outcome.domain,
          });
          emailForm.setError("root", {
            message: tFlow("errors.domainRegistered"),
          });
          return;

        case "invite_pending":
          emailForm.setError("root", {
            message: tFlow("errors.invitePending"),
          });
          return;

        case "wrong_role":
          setWrongRoleHint(outcome.hint);
          emailForm.setError("root", {
            message:
              outcome.hint === STAFF_ROLE
                ? tFlow("errors.wrongRoleWorker")
                : tFlow("errors.wrongRoleCandidate"),
          });
          return;

        case "no_operator_access":
          emailForm.setError("root", {
            message: tFlow("errors.noOperatorAccess"),
          });
          return;

        case "not_found":
          emailForm.setError("root", {
            message: tFlow("errors.notFound"),
          });
          return;
      }
    } catch (err) {
      posthog.captureException(err);
      emailForm.setError("root", { message: tFlow("errors.notFound") });
    }
  }

  async function handlePasswordSubmit(data: PasswordValues) {
    if (!pendingEmail) return;
    passwordForm.clearErrors("root");
    try {
      await loginWithEmail(pendingEmail, data.password);
      posthog.identify(pendingEmail, { email: pendingEmail, role: "client" });
      posthog.capture("user_signed_in", { method: "email", role: "client" });
    } catch (err) {
      const key = getAuthErrorKey(err);
      passwordForm.setError("root", {
        message: key ? tErrors(key) : "",
      });
      posthog.captureException(err);
    }
  }

  function handleBackToEmail() {
    setStep("email");
    setPendingEmail(null);
    passwordForm.reset({ password: "" });
  }

  return (
    <>
      <div className="mb-7 w-full max-w-[440px] text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[1.5px] text-primary">
          {tNav("header.overline")}
        </p>
      </div>

      <Card className="w-full max-w-[440px] overflow-hidden">
        <CardHeader className="border-b border-border px-9 pb-6 pt-8">
          <h1 className="mb-1.5 font-[var(--font-display)] text-[1.45rem] font-extrabold leading-[1.15] tracking-tight text-foreground">
            {step === "email"
              ? tFlow("emailTitle")
              : tFlow("passwordTitle")}
          </h1>
          <p className="text-[0.845rem] font-light leading-[1.65] text-muted-foreground">
            {step === "email"
              ? tFlow("emailSubtitle")
              : tFlow("passwordSubtitle", { email: pendingEmail ?? "" })}
          </p>
        </CardHeader>

        <CardContent className="px-9 pb-8">
          <FieldGroup>
            {step === "email" ? (
              <>
                <form
                  onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
                  className="contents"
                >
                  <ErrorBanner
                    message={emailForm.formState.errors.root?.message ?? ""}
                  />

                  {invitePreview?.ok ? (
                    <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-[0.82rem] text-muted-foreground">
                      <p className="font-medium text-foreground">
                        {tSignUp("inviteFromFacility", {
                          facility: invitePreview.facilityName,
                        })}
                      </p>
                      <p className="mt-1">
                        {tSignUp("inviteUseEmail", {
                          email: invitePreview.email,
                        })}
                      </p>
                    </div>
                  ) : null}

                  <Field data-invalid={!!emailForm.formState.errors.email}>
                    <FieldLabel htmlFor="facility-signin-email">
                      {tFlow("companyEmailLabel")}{" "}
                      <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="facility-signin-email"
                      type="email"
                      placeholder={tFlow("companyEmailPlaceholder")}
                      autoComplete="email"
                      disabled={isBusyEmail || !!invitePreview?.ok}
                      aria-invalid={
                        !!emailForm.formState.errors.email || undefined
                      }
                      {...emailForm.register("email")}
                    />
                    <FieldError className="text-[0.75rem]">
                      {emailForm.formState.errors.email?.message}
                    </FieldError>
                    {!emailForm.formState.errors.email && (
                      <p className="mt-0.5 text-[0.75rem] text-muted-foreground">
                        {tFlow("companyEmailNote")}
                      </p>
                    )}
                  </Field>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isBusyEmail}
                    className="mt-0.5 w-full"
                  >
                    <LoadingSwap isLoading={emailForm.formState.isSubmitting}>
                      <span>{tFlow("continue")}</span>
                    </LoadingSwap>
                  </Button>
                </form>

                <OrDivider text="or continue with"/>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  <GoogleButton
                    text={tFlow("google")}
                    className="min-w-0 flex-1 basis-0 sm:w-auto"
                    disabled={isBusyEmail}
                  />
                  <MicrosoftButton
                    className="min-w-0 flex-1 basis-0 sm:w-auto"
                    disabled={isBusyEmail}
                  />
                </div>

                {wrongRoleHint === STAFF_ROLE ? (
                  <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-[0.82rem] text-muted-foreground">
                    <p className="font-medium text-foreground">
                      {tWrongPanel("workerTitle")}
                    </p>
                    <p className="mt-1">{tWrongPanel("workerSubtitle")}</p>
                    <div className="mt-2">
                      <Link
                        href={withAuthParams("/sign-in/staff")}
                        className="font-semibold text-primary no-underline transition-colors hover:text-primary/80"
                      >
                        {tWrongPanel("workerCta")}
                      </Link>
                    </div>
                  </div>
                ) : null}

                {wrongRoleHint === CANDIDATE_ROLE ? (
                  <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-[0.82rem] text-muted-foreground">
                    <p className="font-medium text-foreground">
                      {tWrongPanel("candidateTitle")}
                    </p>
                    <p className="mt-1">{tWrongPanel("candidateSubtitle")}</p>
                  </div>
                ) : null}

                {domainBlock ? (
                  <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-[0.82rem] text-muted-foreground">
                    <p className="font-medium text-foreground">
                      {tSignUp("facilityAlreadyExistsTitle")}
                    </p>
                    <p className="mt-1">
                      {tSignUp("facilityAlreadyExistsHelp", {
                        domain: domainBlock.domain,
                      })}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <Link
                        href={withAuthParams("/sign-up/operator")}
                        className="font-semibold text-primary no-underline transition-colors hover:text-primary/80"
                      >
                        {tSignUp("getStartedFree")}
                      </Link>
                      <a
                        href="mailto:sales@readykare.com"
                        className="font-semibold text-primary no-underline transition-colors hover:text-primary/80"
                      >
                        {tSignUp("facilityAlreadyExistsCtaContact")}
                      </a>
                    </div>
                  </div>
                ) : null}

                <AuthLegalNote />

                <p className="text-center text-[0.82rem] font-light text-muted-foreground">
                  {tNav("noAccount")}{" "}
                  <Link
                    href={withAuthParams("/sign-up/operator")}
                    className="font-semibold text-primary no-underline transition-colors hover:text-primary/80"
                  >
                    {tNav("signUpFree")}
                  </Link>
                </p>

                <p className="text-center text-[0.82rem] font-light text-muted-foreground">
                  {tNav("workerFooter.prompt")}{" "}
                  <Link
                    href={withAuthParams("/sign-in/staff")}
                    className="font-semibold text-primary no-underline transition-colors hover:text-primary/80"
                  >
                    {tNav("workerFooter.cta")}
                  </Link>
                </p>
              </>
            ) : (
              <form
                onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
                className="contents"
              >
                <ErrorBanner
                  message={passwordForm.formState.errors.root?.message ?? ""}
                />

                <Field data-invalid={!!passwordErrors.password}>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="facility-signin-password">
                      {tFlow("passwordLabel")}{" "}
                      <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Link
                      href={withAuthParams(
                        `/forgot-password?signInReturn=${encodeURIComponent("/sign-in/operator")}`,
                      )}
                      className="text-[0.775rem] font-medium text-primary no-underline transition-colors hover:text-primary/80"
                    >
                      {tFlow("forgotPassword")}
                    </Link>
                  </div>
                  <Password
                    id="facility-signin-password"
                    placeholder={tFlow("passwordPlaceholder")}
                    autoComplete="current-password"
                    disabled={isBusyPassword}
                    aria-invalid={!!passwordErrors.password || undefined}
                    password={passwordValue}
                    error={passwordErrors.password?.message}
                    {...registerPassword("password")}
                  />
                </Field>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isBusyPassword}
                  className="mt-0.5 w-full"
                >
                  <LoadingSwap isLoading={isSubmittingPassword}>
                    <span>{tFlow("submit")}</span>
                  </LoadingSwap>
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  disabled={isBusyPassword}
                  className="w-full"
                  onClick={handleBackToEmail}
                >
                  {tFlow("back")}
                </Button>

                <AuthLegalNote />
              </form>
            )}
          </FieldGroup>
        </CardContent>
      </Card>
    </>
  );
}
