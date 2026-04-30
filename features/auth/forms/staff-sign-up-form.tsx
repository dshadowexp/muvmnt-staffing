"use client";

import { useEffect, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { GiftIcon } from "lucide-react";
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
import { LinkedInButton } from "@/features/auth/components/linkedin-button";
import { Password } from "@/features/auth/components/password-input";
import {
  ErrorBanner,
  OrDivider,
  AuthLegalNote,
} from "@/features/auth/components/auth-primitives";
import { getAuthErrorKey, signUpWithEmail } from "@/services/firebase/auth";
import posthog from "posthog-js";
import { MicrosoftButton } from "../components/microsoft-button";
import { STAFF_ROLE } from "../types";

type SignUpFormProps = {
  /** Called after successful sign-up instead of navigating. Use in embedded
   *  contexts (e.g. screening portals) where the host manages navigation. */
  onSuccess?: () => void;
};

export function StaffSignUpForm({
  onSuccess,
}: SignUpFormProps) {
  const { loading: authLoading, setPendingRole, setPendingReferralCode } = useAuth();
  const searchParams = useSearchParams();
  const { withAuthParams } = useAuthRedirect();
  const referralCode = searchParams.get("ref");
  const t = useTranslations("auth.signUp");
  const tValidation = useTranslations("auth.validation");
  const tErrors = useTranslations("auth.errors");

  const schema = useMemo(
    () =>
      z.object({
        email: z.email(tValidation("emailInvalid")),
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
  type SignUpValues = z.infer<typeof schema>;

  const form = useForm<SignUpValues>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(schema) as Resolver<SignUpValues>,
  });

  const {
    register,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const password = watch("password");
  const isLoading = isSubmitting || authLoading;

  // Worker sign-up always creates a worker account.
  useEffect(() => {
    setPendingRole(STAFF_ROLE);
  }, [setPendingRole]);

  useEffect(() => {
    if (referralCode) {
      setPendingReferralCode(referralCode);
    }
  }, [referralCode, setPendingReferralCode]);

  useEffect(() => {
    const refError = searchParams.get("ref_error");
    if (refError === "invalid" || refError === "not_found") {
      toast.error(t("referralInvalidToast"));
    }
  }, [searchParams, t]);

  async function handleSubmit(data: SignUpValues) {
    try {
      await signUpWithEmail(data.email.trim(), data.password);
      posthog.identify(data.email.trim(), { email: data.email.trim(), role: "worker" });
      posthog.capture("user_signed_up", {
        method: "email",
        role: STAFF_ROLE,
        has_referral: !!referralCode,
      });
      // Navigation is handled by auth-provider after setSession completes.
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
      </div>

      {referralCode && (
        <div className="mb-4 flex w-full max-w-[440px] items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <GiftIcon className="size-4 shrink-0 text-primary" />
          <p className="text-sm text-primary">{t("referralBanner")}</p>
        </div>
      )}

      <Card className="w-full max-w-[440px] overflow-hidden">
        <CardHeader className="border-b border-border px-9 pb-6 pt-8">  
            <h1 className="mb-1.5 font-[var(--font-display)] text-[1.45rem] font-extrabold leading-[1.15] tracking-tight text-foreground">
              {t("titleWorker")}
            </h1>
            <p className="text-[0.845rem] font-light leading-[1.65] text-muted-foreground">
              {t("subtitleWorker")}
            </p>
        </CardHeader>
        <CardContent className="px-9 pb-8 pt-7">
          <FieldGroup>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="contents"
            >
              <ErrorBanner message={errors.root?.message ?? ""} />
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="signup-email">
                  {t("emailLabel")} <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  autoComplete="email"
                  disabled={isLoading}
                  aria-invalid={!!errors.email || undefined}
                  {...register("email")}
                />
                <FieldError>{errors.email?.message}</FieldError>
              </Field>
              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="signup-password">
                  {t("passwordLabel")} <span className="text-destructive">*</span>
                </FieldLabel>
                <Password
                  id="signup-password"
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
            <GoogleButton text="Sign up with Google" />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <LinkedInButton className="min-w-0 flex-1 basis-0 sm:w-auto" text="LinkedIn" disabled={isLoading} />
              <MicrosoftButton className="min-w-0 flex-1 basis-0 sm:w-auto" text="Facebook" disabled={isLoading} />
            </div>
            <AuthLegalNote />
            <p className="text-center text-[0.82rem] font-light text-muted-foreground">
              {t("haveAccount")}{" "}
              <Link
                href={withAuthParams("/sign-in/worker")}
                className="font-semibold text-primary no-underline transition-colors hover:text-primary/80"
              >
                {t("signIn")}
              </Link>
            </p>
          </FieldGroup>
        </CardContent>
      </Card>
    </>
  );
}