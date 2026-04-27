import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SITE_NAME } from "@/lib/constants";
import { Logo } from "@/components/logo";
import { AuthRedirectGate } from "@/features/auth/components/auth-redirect-gate";
import { OrbitalVisual } from "./_components/orbital-visual";

export const metadata: Metadata = {
  title: {
    default: `Account | ${SITE_NAME}`,
    template: `%s | ${SITE_NAME}`,
  },
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tF = await getTranslations("footer.legal");
  const FOOTER_LINKS = [
    { label: tF("privacy"), href: "/privacy" },
    { label: tF("terms"), href: "/terms" },
  ];

  return (
    <div className="flex min-h-screen bg-background">

      {/* LEFT — orbital panel */}
      <div className="relative hidden w-1/2 shrink-0 flex-col overflow-hidden border-r border-border/50 lg:flex">

        {/* Shared ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-primary/[0.03]" />
          <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[80px]" />
        </div>

        {/* Centered orbital — takes all space, logo sits just above it */}
        <div className="relative flex flex-1 flex-col items-center justify-center">
          <div className="relative z-10 mb-20">
            <Logo />
          </div>
          <OrbitalVisual />
        </div>

        {/* Footer links */}
        <div className="relative z-10 flex gap-5 border-t border-border/50 px-10 py-5">
          {FOOTER_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[0.72rem] font-light text-muted-foreground/50 no-underline transition-colors hover:text-muted-foreground"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {/* RIGHT — auth content, same background as left */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-y-auto px-5 py-10 sm:px-8">

        {/* Same ambient glow mirrored on the right */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-primary/[0.03]" />
          <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[80px]" />
        </div>

        {/* Logo — mobile only since it's on the left panel for desktop */}
        <div className="relative z-10 mb-8 flex w-full justify-center lg:hidden">
          <Logo />
        </div>

        <div className="relative z-10 flex w-full flex-col items-center">
          <AuthRedirectGate>
            {children}
          </AuthRedirectGate>
        </div>
      </div>
    </div>
  );
}