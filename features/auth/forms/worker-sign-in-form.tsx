"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { useAuth } from "@/features/auth/providers/auth-provider";
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
import { Password } from "@/features/auth/components/password-input";
import {
  ErrorBanner,
  OrDivider,
} from "@/features/auth/components/auth-primitives";
import { getAuthErrorKey, loginWithEmail } from "@/services/firebase/auth";
import { useAuthRedirect } from "@/features/auth/hooks/use-auth-redirect";
import posthog from "posthog-js";

type SignInFormProps = {
  /** Render a simplified version for embedded contexts (e.g. screening). */
  variant?: "default" | "embedded";
};

export function WorkerSignInForm({
  variant = "default",
}: SignInFormProps = {}) {
  const { loading } = useAuth();
  const { withAuthParams } = useAuthRedirect();
  const [error, setError] = useState("");
  const t = useTranslations("auth.signIn");
  const tValidation = useTranslations("auth.validation");
  const tErrors = useTranslations("auth.errors");

  const schema = useMemo(
    () =>
      z.object({
        email: z.email(tValidation("emailInvalid")),
        password: z.string().min(8, tValidation("passwordMin")),
      }),
    [tValidation],
  );
  type SignInValues = z.infer<typeof schema>;

  const form = useForm<SignInValues>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(schema) as Resolver<SignInValues>,
  });

  const {
    register,
    formState: { errors, isSubmitting },
  } = form;

  const isLoading = loading || isSubmitting;

  async function handleSubmit(data: SignInValues) {
    setError("");
    try {
      await loginWithEmail(data.email.trim(), data.password);
      posthog.identify(data.email.trim(), { email: data.email.trim() });
      posthog.capture("user_signed_in", { method: "email" });
    } catch (err) {
      const key = getAuthErrorKey(err);
      setError(key ? tErrors(key) : "");
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
            {t("title")}
          </h1>
          <p className="text-[0.845rem] font-light leading-[1.65] text-muted-foreground">
            {t("subtitle")}
          </p>
        </CardHeader>

        <CardContent className="px-9 pb-8 pt-7">
          <FieldGroup>
            {variant === "default" && (
              <>
                <GoogleButton text="Sign in with Google" />
                <OrDivider />
              </>
            )}

            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="contents"
            >
              <ErrorBanner message={error} />

              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="signin-email">
                  {t("emailLabel")} <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="signin-email"
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
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="signin-password">
                    {t("passwordLabel")} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Link
                    href={withAuthParams("/forgot-password")}
                    className="text-[0.775rem] font-medium text-primary no-underline transition-colors hover:text-primary/80"
                  >
                    {t("forgotPassword")}
                  </Link>
                </div>
                <Password
                  id="signin-password"
                  placeholder={t("passwordPlaceholder")}
                  autoComplete="current-password"
                  disabled={isLoading}
                  aria-invalid={!!errors.password || undefined}
                  error={errors.password?.message}
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

            {variant === "default" && (
              <p className="text-center text-[0.82rem] font-light text-muted-foreground">
                {t("noAccount")}{" "}
                <Link
                  href={withAuthParams("/sign-up")}
                  className="font-semibold text-primary no-underline transition-colors hover:text-primary/80"
                >
                  {t("createOne")}
                </Link>
              </p>
            )}
          </FieldGroup>
        </CardContent>
      </Card>
    </>
  );
}
