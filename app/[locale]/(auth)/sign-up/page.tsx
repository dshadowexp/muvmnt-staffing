import { redirect, Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Stethoscope, ArrowRight, SearchIcon } from "lucide-react";
import { SITE_NAME } from "@/lib/constants";
import { withAuthParams } from "@/features/auth/lib/auth-params";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: `Sign Up | ${SITE_NAME}`,
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignUpPage({ searchParams }: Props) {
  const params = await searchParams;
  const locale = await getLocale();

  // Preserve ?ref= when redirecting so referral codes carry through
  const ref = typeof params.ref === "string" ? params.ref : null;
  const refSuffix = ref ? `?ref=${ref}` : "";

  // Server-side redirect — no flash, no client JS needed
  const as = typeof params.as === "string" ? params.as : null;
  if (as === "worker")    redirect({ href: `/sign-up/worker${refSuffix}`, locale });
  if (as === "client")    redirect({ href: `/sign-up/client${refSuffix}`, locale });
  if (as === "candidate") redirect({ href: `/sign-up/candidate${refSuffix}`, locale });

  const t = await getTranslations("auth.signUp");

  const roles = [
    {
      value: "client",
      href: `/sign-up/client${refSuffix}`,
      icon: SearchIcon,
      title: t("roleClient"),
      description: t("roleClientDescription"),
      featured: false,
    },
    {
      value: "worker",
      href: `/sign-up/worker${refSuffix}`,
      icon: Stethoscope,
      title: t("roleWorker"),
      description: t("roleWorkerDescription"),
      featured: false,
    },
  ];

  return (
    <>
      {/* Header */}
      <div className="mb-8 w-full max-w-[440px] text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[1.5px] text-primary">
          {t("overline")}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{t("choiceTitle")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("choiceSubtitle")}</p>
      </div>

      {/* Role cards */}
      <div className="flex w-full max-w-[440px] flex-col gap-3">
        {roles.map((role) => (
          <Link
            key={role.value}
            href={role.href}
            className="group block transition-transform duration-150 hover:scale-[1.015] active:scale-[0.99]"
          >
            <div
              className={cn(
                "relative flex items-center gap-4 rounded-lg border bg-card p-5 transition-shadow duration-150",
                role.featured
                  ? "border-primary/40 shadow-sm ring-1 ring-primary/20"
                  : "border-border hover:border-primary/30",
              )}
            >
              {/* Icon container */}
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                  role.featured
                    ? "text-primary"
                    : "group-hover:text-primary",
                )}
              >
                <role.icon className="size-5" />
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-semibold leading-tight",
                    role.featured ? "text-primary" : "text-foreground",
                  )}
                >
                  {role.title}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                  {role.description}
                </p>
              </div>

              {/* Arrow */}
              <ArrowRight
                className={cn(
                  "size-4 shrink-0 transition-all duration-150",
                  role.featured
                    ? "text-primary/60 group-hover:translate-x-0.5 group-hover:text-primary"
                    : "text-muted-foreground/40 group-hover:translate-x-0.5 group-hover:text-primary/60",
                )}
              />
            </div>
          </Link>
        ))}
      </div>

      {/* Sign-in link */}
      <p className="mt-6 text-center text-[0.82rem] font-light text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link
          href={withAuthParams("/sign-in", params)}
          className="font-semibold text-primary no-underline transition-colors hover:text-primary/80"
        >
          {t("signIn")}
        </Link>
      </p>
    </>
  );
}
