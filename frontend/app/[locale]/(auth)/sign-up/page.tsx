"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Hospital, Loader2, Stethoscope } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/auth-provider";
import { useAuthRedirect } from "@/features/auth/use-auth-redirect";
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
import { Password } from "@/features/auth/components/password";
import {
  ErrorBanner,
  OrDivider,
  AuthLegalNote,
} from "@/features/auth/components/auth-primitives";
import {
  signUpSchema,
  type SignUpInput,
} from "@/features/auth/schemas";
import { getAuthErrorMessage, signUpWithEmail } from "@/services/firebase/auth";

type SignUpRole = "client" | "worker";

const ROLES: { value: SignUpRole; icon: LucideIcon; label: string }[] = [
  { value: "client", icon: Hospital, label: "Staffing" },
  { value: "worker", icon: Stethoscope, label: "Work" },
];

/* ── Page ── */

export default function SignUpPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = useAuthRedirect();

  const form = useForm<SignUpInput>({
    defaultValues: {
      role: undefined,
      email: "",
      password: "",
    },
    resolver: zodResolver(signUpSchema) as Resolver<SignUpInput>,
  });

  const {
    register,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const role = watch("role");
  const password = watch("password");
  const isLoading = isSubmitting;
  const hasRole = role === "client" || role === "worker";

  useEffect(() => {
    const p = searchParams.get("as") as SignUpRole | null;
    if (p === "worker" || p === "client") {
      form.setValue("role", p);
    }
  }, [searchParams, form]);

  useEffect(() => {
    if (!authLoading && user) router.replace(redirectTo);
  }, [user, authLoading, router, redirectTo]);

  const handleRoleSelect = (r: SignUpRole) => {
    form.setValue("role", r, { shouldValidate: true });
    const params = new URLSearchParams(searchParams.toString());
    params.set("as", r);
    router.replace(
      `/sign-up?${params.toString()}` as Parameters<typeof router.replace>[0],
      { scroll: false },
    );
  };

  async function handleSubmit(data: SignUpInput) {
    try {
      await signUpWithEmail(data.email.trim(), data.password);
      router.push(redirectTo as Parameters<typeof router.push>[0]);
    } catch (err) {
      form.setError("root", { message: getAuthErrorMessage(err) });
    }
  }

  if (authLoading || user) return <PageSkeleton />;

  return (
    <>
      <div className="mb-7 w-full max-w-[440px] text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[1.5px] text-primary">
          Get started free
        </p>
      </div>

      <Card className="w-full max-w-[440px] overflow-hidden rounded-2xl shadow-lg">
        <CardContent className="px-9 pb-8 pt-7">
          <FieldGroup>
            <Field data-invalid={!!errors.role?.message}>
              <FieldLabel>
                I am looking for <span className="text-destructive">*</span>
              </FieldLabel>
              <div className="flex gap-2">
                {ROLES.map((r) => {
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
              <FieldError>{errors.role?.message}</FieldError>
            </Field>

            {hasRole && (
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="contents"
              >
                <FieldGroup>
                  <GoogleButton />

                  <OrDivider />

                  <ErrorBanner message={errors.root?.message ?? ""} />

                  <Field data-invalid={!!errors.email}>
                    <FieldLabel htmlFor="signup-email">
                      Email Address <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="signup-email"
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
                    <FieldLabel htmlFor="signup-password">
                      Password <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Password
                      id="signup-password"
                      placeholder="Create a password"
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
                      <span>Create Account →</span>
                    </LoadingSwap>
                  </Button>

                  <AuthLegalNote />
                </FieldGroup>
              </form>
            )}

            <p className="text-center text-[0.82rem] font-light text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="font-semibold text-primary no-underline transition-colors hover:text-primary/80"
              >
                Sign in
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
