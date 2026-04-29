"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { z } from "zod";
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
import {
    ErrorBanner,
    SuccessBanner,
} from "@/features/auth/components/auth-primitives";
import { getAuthErrorKey, resetPassword } from "@/services/firebase/auth";
import { useAuthRedirect } from "@/features/auth/hooks/use-auth-redirect";
import { SITE_EMAIL } from "@/lib/constants";

export function ResetPasswordForm() {
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const { withAuthParams } = useAuthRedirect();
    const t = useTranslations("auth.forgot");
    const tValidation = useTranslations("auth.validation");
    const tErrors = useTranslations("auth.errors");

    const schema = useMemo(
        () =>
            z.object({
                email: z.email(tValidation("emailInvalid")),
            }),
        [tValidation],
    );
    type ForgotValues = z.infer<typeof schema>;

    const form = useForm<ForgotValues>({
        defaultValues: { email: "" },
        resolver: zodResolver(schema) as Resolver<ForgotValues>,
    });

    const {
        register,
        formState: { errors, isSubmitting },
    } = form;

    async function handleSubmit(data: ForgotValues) {
        setError("");
        setSuccess("");

        const email = data.email.trim();

        try {
            await resetPassword(email);
            setSuccess(t("sentMessage", { email }));
        } catch (err: unknown) {
            const code = (err as { code?: string })?.code ?? "";
            if (code === "auth/user-not-found") {
                setSuccess(t("sentNotFound", { email }));
            } else {
                const key = getAuthErrorKey(err);
                setError(key ? tErrors(key) : "");
            }
        }
    }

    const sent = !!success;

    return (
        <>
            <div className="mb-7 w-full max-w-[440px] text-center">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[1.5px] text-primary">
                    {t("overline")}
                </p>
            </div>

            <Card className="w-full max-w-[440px] overflow-hidden">
                {!sent ? (
                <>
                    <CardHeader className="border-b border-border px-9 pb-6 pt-8">
                        <h2 className="mb-1.5 font-[var(--font-display)] text-[1.45rem] font-extrabold leading-[1.15] tracking-tight text-foreground">
                            {t("title")}
                        </h2>
                        <p className="text-[0.845rem] font-light leading-[1.65] text-muted-foreground">
                            {t("subtitle")}
                        </p>
                    </CardHeader>

                    <CardContent className="px-9 pb-8 pt-7">
                        <form
                            onSubmit={form.handleSubmit(handleSubmit)}
                            className="space-y-6"
                        >
                            <FieldGroup>
                            <ErrorBanner message={error} />

                            <Field data-invalid={!!errors.email}>
                                <FieldLabel htmlFor="reset-email">
                                {t("emailLabel")} <span className="text-destructive">*</span>
                                </FieldLabel>
                                <Input
                                    id="reset-email"
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

                            <p className="text-center text-[0.82rem] font-light text-muted-foreground">
                                {t("remembered")}{" "}
                                <Link
                                    href={withAuthParams("/sign-in")}
                                    className="font-semibold text-primary no-underline hover:text-primary/80"
                                >
                                    {t("backToSignIn")}
                                </Link>
                            </p>
                            </FieldGroup>
                        </form>
                    </CardContent>
                </>
                ) : (
                <>
                    <CardHeader className="border-b border-border px-9 pb-6 pt-8">
                    <h2 className="mb-1.5 font-[var(--font-display)] text-[1.45rem] font-extrabold leading-[1.15] tracking-tight text-foreground">
                        {t("sentTitle")}
                    </h2>
                    <p className="text-[0.845rem] font-light leading-[1.65] text-muted-foreground">
                        {t("sentSubtitle")}
                    </p>
                    </CardHeader>

                    <CardContent className="px-9 pb-8 pt-3">
                    <FieldGroup>
                        <SuccessBanner message={success} />

                        <Button asChild size="lg" className="w-full">
                        <Link href={withAuthParams("/sign-in")}>{t("backButton")}</Link>
                        </Button>

                        <p className="text-center text-[0.78rem] font-light leading-[1.6] text-muted-foreground">
                        {t("needHelp")}{" "}
                        <a
                            href={`mailto:${SITE_EMAIL}`}
                            className="font-medium text-primary no-underline hover:text-primary/80"
                        >
                            {t("contactSupport")}
                        </a>
                        </p>
                    </FieldGroup>
                    </CardContent>
                </>
                )}
            </Card>

            {!sent && (
                <p className="mt-5 text-center text-[0.78rem] font-light text-muted-foreground">
                {t("noAccount")}{" "}
                <Link
                    href={withAuthParams("/sign-up")}
                    className="font-semibold text-primary no-underline hover:text-primary/80"
                >
                    {t("signUp")}
                </Link>
                </p>
            )}
        </>
    );
}
