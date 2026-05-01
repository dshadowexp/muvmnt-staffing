import { redirect } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Hospital, Stethoscope, ArrowRight } from "lucide-react";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Sign In | ${SITE_NAME}`,
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams;
  const locale = await getLocale();

  const as = typeof params.as === "string" ? params.as : null;
  if (as === "staff")   redirect({ href: "/sign-in/staff", locale });
  if (as === "operator") redirect({ href: "/sign-in/operator", locale });

  const t = await getTranslations("auth.signIn");

  const roles = [
    {
      value: "operator",
      href: "/sign-in/operator",
      icon: Hospital,
      title: t("roleClient"),
      description: t("roleClientDescription"),
    },
    {
      value: "staff",
      href: "/sign-in/staff",
      icon: Stethoscope,
      title: t("roleWorker"),
      description: t("roleWorkerDescription"),
    },
  ];

  return (
    <>
      {/* Header */}
      <div className="mb-10 w-full max-w-3xl text-center">
        <p className="mb-2 text-md font-semibold uppercase tracking-[1.5px] text-primary">
          {t("overline")}
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {t("choiceSubtitle")}
        </p>
      </div>

      {/* Split choice panels (stacks on mobile) */}
      <div className="w-full max-w-4xl">
        <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card/40 shadow-[0_1px_2px_rgba(16,24,40,0.04)] md:grid-cols-2">
          {roles.map((role, idx) => (
            <div
              key={role.value}
              className={[
                "relative flex flex-col items-center justify-center px-8 py-12 text-center",
                idx === 1 ? "md:border-l md:border-border" : "",
              ].join(" ")}
            >
              {/* Soft glow */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_15%,oklch(0.527_0.154_150.069/0.08),transparent_60%)]"
              />

              <div className="relative z-10 flex max-w-sm flex-col items-center">
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                  <role.icon className="size-6" />
                </div>

                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  {role.title}
                </h2>
                <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                  {role.description}
                </p>

                <Link
                  href={role.href}
                  className="group mt-7 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {t("meta.title")}
                  <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                </Link>

                {role.value === "facility" ? (
                  <p className="mt-6 text-xs text-muted-foreground">
                    {t("noAccount")}{" "}
                    <br />
                    <a
                      href="mailto:sales@readykare.com"
                      className="font-semibold text-primary no-underline transition-colors hover:text-primary/80"
                    >
                      {t("contactSales")}
                    </a>{" "}
                    {t("or")}{" "}
                    <Link
                      href="/sign-up?as=client"
                      className="font-semibold text-primary no-underline transition-colors hover:text-primary/80"
                    >
                      {t("getStartedFree")}
                    </Link>
                  </p>
                ) : (
                  <p className="mt-6 text-xs text-muted-foreground">
                    {t("noAccount")}{" "}
                    <br />
                    <Link
                      href="/sign-up?as=worker"
                      className="font-semibold text-primary no-underline transition-colors hover:text-primary/80"
                    >
                      {t("createOne")}
                    </Link>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile-only extra spacing so footer doesn't feel cramped */}
      <div className="h-2 md:hidden" />
    </>
  );
}
