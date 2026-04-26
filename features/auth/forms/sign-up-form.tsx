"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { GiftIcon } from "lucide-react";
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
import type { UserRole } from "@/features/auth/types";
import posthog from "posthog-js";

type SignUpFormProps = {
  role: UserRole;
};

export function SignUpForm({ role }: SignUpFormProps) {
  const { loading: authLoading, setPendingRole, setPendingReferralCode } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { redirectTo, withAuthParams } = useAuthRedirect();
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

  // Set the pending role immediately from the prop — no selection needed
  useEffect(() => {
    setPendingRole(role);
  }, [role, setPendingRole]);

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
      posthog.identify(data.email.trim(), { email: data.email.trim(), role });
      posthog.capture("user_signed_up", {
        method: "email",
        role,
        has_referral: !!referralCode,
      });
      router.push(redirectTo as Parameters<typeof router.push>[0]);
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
        <h1 className="text-2xl font-bold tracking-tight">
          {role === "worker" ? t("titleWorker") : t("titleClient")}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {role === "worker" ? t("subtitleWorker") : t("subtitleClient")}
        </p>
      </div>

      {referralCode && (
        <div className="mb-4 flex w-full max-w-[440px] items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <GiftIcon className="size-4 shrink-0 text-primary" />
          <p className="text-sm text-primary">{t("referralBanner")}</p>
        </div>
      )}

      <Card className="w-full max-w-[440px] overflow-hidden rounded-2xl shadow-lg">
        <CardContent className="px-9 pb-8 pt-7">
          <FieldGroup>
            <GoogleButton />
            <OrDivider />
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
            <AuthLegalNote />

            <p className="text-center text-[0.82rem] font-light text-muted-foreground">
              {t("haveAccount")}{" "}
              <Link
                href={withAuthParams("/sign-in")}
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