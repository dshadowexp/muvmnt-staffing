"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { Check, GiftIcon, Hospital, Stethoscope } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
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
import type { UserRole } from "@/types/auth";

export function SignUpForm() {
  const { loading: authLoading, setPendingRole, setPendingReferralCode } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = useAuthRedirect();
  const [role, setRole] = useState<UserRole | null>(null);
  const referralCode = searchParams.get("ref");
  const t = useTranslations("auth.signUp");
  const tValidation = useTranslations("auth.validation");
  const tErrors = useTranslations("auth.errors");

  const roles = useMemo<{ value: UserRole; icon: LucideIcon; label: string }[]>(
    () => [
      { value: "client", icon: Hospital, label: t("roleClient") },
      { value: "worker", icon: Stethoscope, label: t("roleWorker") },
    ],
    [t],
  );

  const schema = useMemo(
    () =>
      z.object({
        email: z.email(tValidation("emailInvalid")),
        password: z
          .string()
          .min(6, tValidation("passwordMin"))
          .refine((p) => p.length >= 8, tValidation("passwordLength"))
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
  const hasRole = role === "client" || role === "worker";

  useEffect(() => {
    const p = searchParams.get("as") as UserRole | null;
    if (p === "worker" || p === "client") {
      setRole(p);
      setPendingRole(p);
    }
  }, [searchParams, setPendingRole]);

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

  const handleRoleSelect = (r: UserRole) => {
    setRole(r);
    setPendingRole(r);
    const params = new URLSearchParams(searchParams.toString());
    params.set("as", r);
    router.replace(
      `/sign-up?${params.toString()}` as Parameters<typeof router.replace>[0],
      { scroll: false },
    );
  };

  async function handleSubmit(data: SignUpValues) {
    try {
      await signUpWithEmail(data.email.trim(), data.password);
      router.push(redirectTo as Parameters<typeof router.push>[0]);
    } catch (err) {
      const key = getAuthErrorKey(err);
      form.setError("root", { message: key ? tErrors(key) : "" });
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

      <Card className="w-full max-w-[440px] overflow-hidden rounded-2xl shadow-lg">
        <CardContent className="px-9 pb-8 pt-7">
          <FieldGroup>
            <Field>
              <FieldLabel>
                {t("roleLabel")} <span className="text-destructive">*</span>
              </FieldLabel>
              <div className="flex gap-2">
                {roles.map((r) => {
                  const active = role === r.value;
                  return (
                    <Button
                      key={r.value}
                      type="button"
                      variant={active ? "default" : "outline"}
                      size="lg"
                      onClick={() => handleRoleSelect(r.value)}
                      disabled={isLoading}
                      className={cn(
                        "flex flex-1 gap-2 font-bold",
                        active && "border-2 border-primary",
                      )}
                    >
                      <r.icon
                        className={cn(
                          "size-4",
                          active
                            ? "text-primary-foreground"
                            : "text-muted-foreground",
                        )}
                      />
                      <span className="font-[var(--font-display)] text-[0.82rem]">
                        {r.label}
                      </span>
                      {active && (
                        <Check
                          className="size-4 text-primary-foreground"
                          strokeWidth={3}
                        />
                      )}
                    </Button>
                  );
                })}
              </div>
            </Field>

            {hasRole && (
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
              </FieldGroup>
            )}

            <p className="text-center text-[0.82rem] font-light text-muted-foreground">
              {t("haveAccount")}{" "}
              <Link
                href="/sign-in"
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
