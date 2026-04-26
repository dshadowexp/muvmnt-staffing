import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Hospital, Stethoscope, ArrowRight } from "lucide-react";
import { SITE_NAME } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: `Sign Up | ${SITE_NAME}`,
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignUpPage({ searchParams }: Props) {
  const params = await searchParams;

  // Preserve ?ref= when redirecting so referral codes carry through
  const ref = typeof params.ref === "string" ? params.ref : null;
  const refSuffix = ref ? `?ref=${ref}` : "";

  // Server-side redirect — no flash, no client JS needed
  const as = typeof params.as === "string" ? params.as : null;
  if (as === "worker") redirect(`/sign-up/worker${refSuffix}`);
  if (as === "client") redirect(`/sign-up/client${refSuffix}`);

  const t = await getTranslations("auth.signUp");

  const roles = [
    {
      value: "client",
      href: `/sign-up/client${refSuffix}`,
      icon: Hospital,
      title: t("roleClient"),
      description: t("roleClientDescription"),
    },
    {
      value: "worker",
      href: `/sign-up/worker${refSuffix}`,
      icon: Stethoscope,
      title: t("roleWorker"),
      description: t("roleWorkerDescription"),
    }
  ];

  return (
    <>
      <div className="mb-8 w-full max-w-[440px] text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[1.5px] text-primary">
          {t("overline")}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{t("choiceTitle")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {t("choiceSubtitle")}
        </p>
      </div>

      <div className="flex w-full max-w-[440px] flex-col gap-3">
        {roles.map((role) => (
          <Link key={role.value} href={role.href} className="group no-underline">
            <Card className="w-full cursor-pointer rounded-2xl border-2 shadow-sm transition-all duration-150 hover:border-primary/60 hover:shadow-md">
              <CardContent className="flex items-center gap-4 px-6 py-5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:bg-primary/5 group-hover:text-primary">
                  <role.icon className="size-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold leading-tight">{role.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {role.description}
                  </p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <p className="mt-6 text-center text-[0.82rem] font-light text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link
          href="/sign-in"
          className="font-semibold text-primary no-underline transition-colors hover:text-primary/80"
        >
          {t("signIn")}
        </Link>
      </p>
    </>
  );
}