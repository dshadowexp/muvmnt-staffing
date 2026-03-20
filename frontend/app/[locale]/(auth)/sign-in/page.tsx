"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/auth-provider";
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
import { Password } from "@/features/auth/components/password";
import { ErrorBanner, OrDivider } from "@/features/auth/components/auth-primitives";
import {
  signInSchema,
  type SignInInput,
} from "@/features/auth/schemas";
import { getAuthErrorMessage, loginWithEmail } from "@/services/firebase/auth";

export default function SignInPage() {
  const { user, loading } = useAuth();
  const [error, setError] = useState("");

  const form = useForm<SignInInput>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(signInSchema) as Resolver<SignInInput>,
  });

  const {
    register,
    formState: { errors, isSubmitting },
  } = form;

  const isLoading = loading || isSubmitting;

  async function handleSubmit(data: SignInInput) {
    setError("");
    try {
      await loginWithEmail(data.email.trim(), data.password);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  }

  if (loading || user) return <PageSkeleton />;

  return (
    <>
      <div className="mb-7 w-full max-w-[440px] text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[1.5px] text-primary">
          Welcome back
        </p>
      </div>

      <Card className="w-full max-w-[440px] overflow-hidden rounded-2xl shadow-lg">
        <CardHeader className="border-b border-border px-9 pb-6 pt-8">
          <h1 className="mb-1.5 font-[var(--font-display)] text-[1.45rem] font-extrabold leading-[1.15] tracking-tight text-foreground">
            Sign in to your account
          </h1>
          <p className="text-[0.845rem] font-light leading-[1.65] text-muted-foreground">
            Access your staffing requests and account details.
          </p>
        </CardHeader>

        <CardContent className="px-9 pb-8 pt-7">
          <FieldGroup>
            <GoogleButton />

            <OrDivider />

            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="contents"
            >
              <ErrorBanner message={error} />

              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="signin-email">
                  Email Address <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="you@organization.ca"
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
                    Password <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Link
                    href="/forgot-password"
                    className="text-[0.775rem] font-medium text-primary no-underline transition-colors hover:text-primary/80"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Password
                  id="signin-password"
                  placeholder="Your password"
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
                  <span>Sign In →</span>
                </LoadingSwap>
              </Button>
            </form>

            <p className="text-center text-[0.82rem] font-light text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/sign-up"
                className="font-semibold text-primary no-underline transition-colors hover:text-primary/80"
              >
                Create one
              </Link>
            </p>
          </FieldGroup>
        </CardContent>
      </Card>
    </>
  );
}

function PageSkeleton() {
  return (
    <Card className="flex w-full max-w-[440px] items-center justify-center rounded-2xl px-9 py-16">
      <Loader2 className="size-7 animate-spin text-primary" />
    </Card>
  );
}
