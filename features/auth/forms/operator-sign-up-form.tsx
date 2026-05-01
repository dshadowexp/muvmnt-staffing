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
import {
  getAuthErrorKey,
  EMAIL_LINK_LS_EMAIL,
  EMAIL_LINK_LS_NAME,
  signUpWithEmail,
} from "@/services/firebase/auth";
import posthog from "posthog-js";
import { checkFacilityDomainAction } from "@/features/auth/actions";
import { previewFacilityTeamInviteAction } from "@/features/account/actions/invite";
import { OPERATOR_ROLE } from "../types";

// ─── Component ────────────────────────────────────────────────────────────────

type Step = "details" | "password";

const OPERATOR_LS_FIRST_NAME = "readykare_operator_first_name";
const OPERATOR_LS_LAST_NAME = "readykare_operator_last_name";

export function OperatorSignUpForm() {
  const { setPendingRole, setPendingInviteToken } = useAuth();
  const searchParams = useSearchParams();
  const { withAuthParams } = useAuthRedirect();
  const t = useTranslations("auth.signUp");
  const tValidation = useTranslations("auth.validation");
  const tErrors = useTranslations("auth.errors");

  const [step, setStep] = useState<Step>("details");
  const [pending, setPending] = useState<{
    email: string;
    displayName: string;
    firstName: string;
    lastName: string;
  } | null>(null);

  const [domainBlock, setDomainBlock] = useState<
    | { status: "facility_exists"; facilityName: string | null; domain: string }
    | { status: "invite_pending"; email: string }
    | null
  >(null);

  const [invitePreview, setInvitePreview] = useState<
    Awaited<ReturnType<typeof previewFacilityTeamInviteAction>> | null
  >(null);

  const detailsSchema = useMemo(
    () =>
      z.object({
        firstName: z.string().min(1, tValidation("firstNameRequired")),
        lastName:  z.string().min(1, tValidation("lastNameRequired")),
        email: z
          .email(tValidation("emailInvalid")),
          // .refine(
          //   (e) => !isPersonalEmailDomain(e),
          //   tValidation("companyEmailPersonal"),
          // ),
      }),
    [tValidation],
  );
  type DetailsValues = z.infer<typeof detailsSchema>;

  const passwordSchema = useMemo(
    () =>
      z.object({
        password: z
          .string()
          .min(8, tValidation("passwordMin"))
          .refine((p) => p.length >= 9, tValidation("passwordLength"))
          .refine((p) => /[A-Z]/.test(p), tValidation("passwordUpper"))
          .refine((p) => /[0-9]/.test(p), tValidation("passwordNumber"))
          .refine((p) => /[^A-Za-z0-9]/.test(p), tValidation("passwordSpecial")),
      }),
    [tValidation],
  );
  type PasswordValues = z.infer<typeof passwordSchema>;

  const detailsForm = useForm<DetailsValues>({
    defaultValues: { firstName: "", lastName: "", email: "" },
    resolver: zodResolver(detailsSchema) as Resolver<DetailsValues>,
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

  const password = watch("password");

  useEffect(() => {
    setPendingRole(OPERATOR_ROLE);
  }, [setPendingRole]);

  useEffect(() => {
    const tok = searchParams.get("invite_token")?.trim();
    if (!tok) {
      setPendingInviteToken(null);
      setInvitePreview(null);
      return;
    }
    setPendingInviteToken(tok);
    void previewFacilityTeamInviteAction(tok).then(setInvitePreview);
  }, [searchParams, setPendingInviteToken]);

  useEffect(() => {
    if (invitePreview?.ok) {
      detailsForm.setValue("email", invitePreview.email);
    }
  }, [invitePreview, detailsForm]);

  async function handleDetailsSubmit(data: DetailsValues) {
    try {
      const firstName = data.firstName.trim();
      const lastName = data.lastName.trim();
      const displayName = `${firstName} ${lastName}`;
      const email = data.email.trim().toLowerCase();
      setDomainBlock(null);

      if (invitePreview?.ok) {
        if (email !== invitePreview.email.toLowerCase()) {
          detailsForm.setError("email", {
            message: t("inviteEmailMismatch"),
          });
          return;
        }
        setPending({ email, displayName, firstName, lastName });
        setStep("password");
        return;
      }

      const domain = email.split("@")[1]?.toLowerCase() ?? "";
      const domainCheck = await checkFacilityDomainAction(email);
      if (domainCheck.status === "invite_pending") {
        setDomainBlock({ status: "invite_pending", email });
        detailsForm.setError("root", { message: t("facilityInvitePending") });
        return;
      }
      if (domainCheck.status === "facility_exists") {
        setDomainBlock({
          status: "facility_exists",
          facilityName: domainCheck.facilityName ?? null,
          domain,
        });
        detailsForm.setError("root", {
          message: t("facilityAlreadyExists", {
            facility: domainCheck.facilityName ?? t("facilityAlreadyExistsFallback"),
          }),
        });
        return;
      }

      setPending({ email, displayName, firstName, lastName });
      setStep("password");
    } catch (err) {
      const key = getAuthErrorKey(err);
      detailsForm.setError("root", { message: key ? tErrors(key) : "" });
      posthog.captureException(err);
    }
  }

  async function handlePasswordSubmit(data: PasswordValues) {
    if (!pending) return;
    try {
      // Store operator identity for onboarding (facility details step).
      localStorage.setItem(EMAIL_LINK_LS_EMAIL, pending.email);
      localStorage.setItem(EMAIL_LINK_LS_NAME, pending.displayName);
      localStorage.setItem(OPERATOR_LS_FIRST_NAME, pending.firstName);
      localStorage.setItem(OPERATOR_LS_LAST_NAME, pending.lastName);

      await signUpWithEmail(pending.email, data.password, pending.displayName);

      posthog.identify(pending.email, { email: pending.email, role: OPERATOR_ROLE });
      posthog.capture("user_signed_up", { method: "email", role: OPERATOR_ROLE });
    } catch (err) {
      const key = getAuthErrorKey(err);
      passwordForm.setError("root", { message: key ? tErrors(key) : "" });
      posthog.captureException(err);
    }
  }

  return (
    <>
      <div className="mb-7 w-full max-w-[440px] text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[1.5px] text-primary">
          {t("overline")}
        </p>
      </div>

      <Card className="w-full max-w-[440px] overflow-hidden">
        <CardHeader className="border-b border-border px-9 pb-6 pt-8">  
            <h1 className="mb-1.5 font-[var(--font-display)] text-[1.45rem] font-extrabold leading-[1.15] tracking-tight text-foreground">
              {step === "details" ? t("titleClient") : t("createPasswordTitle")}
            </h1>
            <p className="text-[0.845rem] font-light leading-[1.65] text-muted-foreground">
              {step === "details" ? t("subtitleClient") : t("createPasswordSubtitle")}
            </p>
        </CardHeader>
        <CardContent className="px-9 pb-8">
          <FieldGroup>
            {step === "details" ? (
              <>
                <form
                  onSubmit={detailsForm.handleSubmit(handleDetailsSubmit)}
                  className="contents"
                >
                  <ErrorBanner message={detailsForm.formState.errors.root?.message ?? ""} />

                  {invitePreview?.ok ? (
                    <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-[0.82rem] text-muted-foreground">
                      <p className="font-medium text-foreground">
                        {t("inviteFromFacility", { facility: invitePreview.facilityName })}
                      </p>
                      <p className="mt-1">{t("inviteUseEmail", { email: invitePreview.email })}</p>
                    </div>
                  ) : null}

                  {/* First + Last name — side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <Field data-invalid={!!detailsForm.formState.errors.firstName}>
                      <FieldLabel htmlFor="client-first-name">
                        {t("firstNameLabel")} <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        id="client-first-name"
                        type="text"
                        placeholder={t("firstNamePlaceholder")}
                        autoComplete="given-name"
                        disabled={detailsForm.formState.isSubmitting}
                        aria-invalid={!!detailsForm.formState.errors.firstName || undefined}
                        {...detailsForm.register("firstName")}
                      />
                      <FieldError>{detailsForm.formState.errors.firstName?.message}</FieldError>
                    </Field>

                    <Field data-invalid={!!detailsForm.formState.errors.lastName}>
                      <FieldLabel htmlFor="client-last-name">
                        {t("lastNameLabel")} <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        id="client-last-name"
                        type="text"
                        placeholder={t("lastNamePlaceholder")}
                        autoComplete="family-name"
                        disabled={detailsForm.formState.isSubmitting}
                        aria-invalid={!!detailsForm.formState.errors.lastName || undefined}
                        {...detailsForm.register("lastName")}
                      />
                      <FieldError>{detailsForm.formState.errors.lastName?.message}</FieldError>
                    </Field>
                  </div>

                  {/* Company email */}
                  <Field data-invalid={!!detailsForm.formState.errors.email}>
                    <FieldLabel htmlFor="client-email">
                      {t("companyEmailLabel")} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="client-email"
                      type="email"
                      placeholder={t("companyEmailPlaceholder")}
                      autoComplete="email"
                      disabled={detailsForm.formState.isSubmitting || !!invitePreview?.ok}
                      aria-invalid={!!detailsForm.formState.errors.email || undefined}
                      {...detailsForm.register("email")}
                    />
                    <FieldError className="text-[0.75rem]">
                      {detailsForm.formState.errors.email?.message}
                    </FieldError>
                    {!detailsForm.formState.errors.email && (
                      <p className="mt-0.5 text-[0.75rem] text-muted-foreground">
                        {t("companyEmailNote")}
                      </p>
                    )}
                  </Field>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={detailsForm.formState.isSubmitting}
                    className="mt-0.5 w-full"
                  >
                    <LoadingSwap isLoading={detailsForm.formState.isSubmitting}>
                      <span>{t("continue")}</span>
                    </LoadingSwap>
                  </Button>
                </form>
                <OrDivider text="get started with"/>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  <GoogleButton
                    className="min-w-0 flex-1 basis-0 sm:w-auto"
                    disabled={detailsForm.formState.isSubmitting}
                  />
                  <MicrosoftButton
                    className="min-w-0 flex-1 basis-0 sm:w-auto"
                    disabled={detailsForm.formState.isSubmitting}
                  />
                </div>
              </>
            ) : (
              <form
                onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
                className="contents"
              >
                <ErrorBanner message={passwordForm.formState.errors.root?.message ?? ""} />

                <Field data-invalid={!!passwordErrors.password}>
                  <FieldLabel htmlFor="client-password">
                    {t("passwordLabel")} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Password
                    id="client-password"
                    placeholder={t("passwordPlaceholder")}
                    autoComplete="new-password"
                    disabled={isSubmittingPassword}
                    aria-invalid={!!passwordErrors.password || undefined}
                    password={password}
                    error={passwordErrors.password?.message}
                    showStrength
                    {...registerPassword("password")}
                  />
                </Field>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmittingPassword}
                  className="mt-0.5 w-full"
                >
                  <LoadingSwap isLoading={isSubmittingPassword}>
                    <span>{t("submit")}</span>
                  </LoadingSwap>
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  disabled={isSubmittingPassword}
                  className="w-full"
                  onClick={() => {
                    passwordForm.reset({ password: "" });
                    setStep("details");
                  }}
                >
                  {t("back")}
                </Button>
              </form>
            )}

            <AuthLegalNote />

            <p className="text-center text-[0.82rem] font-light text-muted-foreground">
              {t("haveAccount")}{" "}
              <Link
                href={withAuthParams("/sign-in?as=facility")}
                className="font-semibold text-primary no-underline transition-colors hover:text-primary/80"
              >
                {t("signIn")}
              </Link>
            </p>

            {domainBlock?.status === "facility_exists" && (
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-[0.82rem] text-muted-foreground">
                <p className="font-medium text-foreground">
                  {t("facilityAlreadyExistsTitle")}
                </p>
                <p className="mt-1">
                  {t("facilityAlreadyExistsHelp", {
                    domain: domainBlock.domain,
                  })}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Link
                    href={withAuthParams("/sign-in?as=facility")}
                    className="font-semibold text-primary no-underline transition-colors hover:text-primary/80"
                  >
                    {t("facilityAlreadyExistsCtaSignIn")}
                  </Link>
                  <a
                    href="mailto:sales@readykare.com"
                    className="font-semibold text-primary no-underline transition-colors hover:text-primary/80"
                  >
                    {t("facilityAlreadyExistsCtaContact")}
                  </a>
                </div>
              </div>
            )}

            {domainBlock?.status === "invite_pending" && (
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-[0.82rem] text-muted-foreground">
                <p className="font-medium text-foreground">
                  {t("facilityInvitePendingTitle")}
                </p>
                <p className="mt-1">{t("facilityInvitePendingHelp")}</p>
                <div className="mt-2">
                  <Link
                    href={withAuthParams("/sign-in?as=facility")}
                    className="font-semibold text-primary no-underline transition-colors hover:text-primary/80"
                  >
                    {t("facilityInvitePendingCta")}
                  </Link>
                </div>
              </div>
            )}

            <p className="text-center text-[0.82rem] font-light text-muted-foreground">
              {t("lookingForWork")}{" "}
              <Link
                href={withAuthParams("/sign-up/staff")}
                className="font-semibold text-primary no-underline transition-colors hover:text-primary/80"
              >
                {t("joinOurNetwork")}
              </Link>
            </p>
          </FieldGroup>
        </CardContent>
      </Card>
    </>
  );
}
