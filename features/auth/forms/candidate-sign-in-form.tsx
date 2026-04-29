"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { ErrorBanner } from "@/features/auth/components/auth-primitives";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";

type Values = { token: string };

export function CandidateSignInForm() {
  const router = useRouter();
  const t = useTranslations("auth.candidateSignIn");
  const tValidation = useTranslations("auth.validation");

  const [error, setError] = useState("");

  const schema = useMemo(
    () =>
      z.object({
        token: z.string().min(4, tValidation("required")),
      }),
    [tValidation],
  );

  const form = useForm<Values>({
    defaultValues: { token: "" },
    resolver: zodResolver(schema) as Resolver<Values>,
  });

  const {
    register,
    formState: { errors, isSubmitting },
  } = form;

  async function handleSubmit(data: Values) {
    setError("");
    const token = data.token.trim();
    if (!token) return;
    // Candidates access the platform through their screening invite link.
    // This simply routes them to the token-based entrypoint.
    router.push(`/s/${encodeURIComponent(token)}` as Parameters<typeof router.push>[0]);
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
            <form onSubmit={form.handleSubmit(handleSubmit)} className="contents">
              <ErrorBanner message={error} />

              <Field data-invalid={!!errors.token}>
                <FieldLabel htmlFor="candidate-token">
                  {t("tokenLabel")} <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="candidate-token"
                  type="text"
                  placeholder={t("tokenPlaceholder")}
                  autoComplete="one-time-code"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.token || undefined}
                  {...register("token")}
                />
                <FieldError>{errors.token?.message}</FieldError>
              </Field>

              <Button type="submit" size="lg" disabled={isSubmitting} className="mt-0.5 w-full">
                <LoadingSwap isLoading={isSubmitting}>
                  <span>{t("cta")}</span>
                </LoadingSwap>
              </Button>
            </form>
          </FieldGroup>
        </CardContent>
      </Card>
    </>
  );
}

