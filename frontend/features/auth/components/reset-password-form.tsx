"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
    forgotPasswordSchema,
    type ForgotPasswordInput,
} from "@/features/auth/schemas";
import { getAuthErrorMessage, resetPassword } from "@/services/firebase/auth";

export function ResetPasswordForm() {
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const form = useForm<ForgotPasswordInput>({
        defaultValues: { email: "" },
        resolver: zodResolver(forgotPasswordSchema) as Resolver<ForgotPasswordInput>,
    });

    const {
        register,
        formState: { errors, isSubmitting },
    } = form;

    async function handleSubmit(data: ForgotPasswordInput) {
        setError("");
        setSuccess("");

        const email = data.email.trim();

        try {
            await resetPassword(email);
            setSuccess(
                `We've sent a password reset link to ${email}. Check your inbox — it may take a minute or two to arrive.`
            );
        } catch (err: unknown) {
            const code = (err as { code?: string })?.code ?? "";
            if (code === "auth/user-not-found") {
                setSuccess(
                    `If an account exists for ${email}, a reset link has been sent. Check your inbox.`
                );
            } else {
                setError(getAuthErrorMessage(err));
            }
        }
    }

    const sent = !!success;

    return (
        <>
            <div className="mb-7 w-full max-w-[440px] text-center">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[1.5px] text-primary">
                    Account recovery
                </p>
            </div>

            <Card className="w-full max-w-[440px] overflow-hidden rounded-2xl shadow-lg">
                {!sent ? (
                <>
                    <CardHeader className="border-b border-border px-9 pb-6 pt-8">
                        <h2 className="mb-1.5 font-[var(--font-display)] text-[1.45rem] font-extrabold leading-[1.15] tracking-tight text-foreground">
                            Reset your password
                        </h2>
                        <p className="text-[0.845rem] font-light leading-[1.65] text-muted-foreground">
                            Enter the email address you used to sign up and we&apos;ll send
                            you a reset link.
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
                                Email Address <span className="text-destructive">*</span>
                                </FieldLabel>
                                <Input
                                id="reset-email"
                                type="email"
                                placeholder="you@organization.ca"
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
                                    <span>Send Reset Link →</span>
                                </LoadingSwap>
                            </Button>

                            <p className="text-center text-[0.82rem] font-light text-muted-foreground">
                                Remembered it?{" "}
                                <Link
                                href="/sign-in"
                                className="font-semibold text-primary no-underline hover:text-primary/80"
                                >
                                Back to sign in
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
                        Reset link sent
                    </h2>
                    <p className="text-[0.845rem] font-light leading-[1.65] text-muted-foreground">
                        Follow the link in your email to choose a new password.
                    </p>
                    </CardHeader>

                    <CardContent className="px-9 pb-8 pt-3">
                    <FieldGroup>
                        <SuccessBanner message={success} />

                        <Button asChild size="lg" className="w-full">
                        <Link href="/sign-in">← Back to Sign In</Link>
                        </Button>

                        <p className="text-center text-[0.78rem] font-light leading-[1.6] text-muted-foreground">
                        Need help?{" "}
                        <a
                            href="mailto:info@muvmnt.ca"
                            className="font-medium text-primary no-underline hover:text-primary/80"
                        >
                            Contact support
                        </a>
                        </p>
                    </FieldGroup>
                    </CardContent>
                </>
                )}
            </Card>

            {!sent && (
                <p className="mt-5 text-center text-[0.78rem] font-light text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                    href="/sign-up"
                    className="font-semibold text-primary no-underline hover:text-primary/80"
                >
                    Sign up for free
                </Link>
                </p>
            )}
        </>
    );
}
