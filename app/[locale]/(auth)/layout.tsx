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

export default async function AuthLayout({ children }: { children: React.ReactNode; }) {
  const tF = await getTranslations("footer.legal");
  const FOOTER_LINKS = [
    { label: tF("privacy"), href: "/privacy" },
    { label: tF("terms"), href: "/terms" },
  ];

  return (
    <div className="flex min-h-screen">
      {/* LEFT — ORBIT VISUAL */}
      <div className="relative hidden w-1/2 flex-col overflow-hidden bg-zinc-950 lg:flex">
        
        {/* Background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.12),transparent_60%)]" />

        {/* Centered Orbit */}
        <div className="relative flex flex-1 items-center justify-center">
          <OrbitalVisual />
        </div>

        {/* Footer Links (restored, clean) */}
        <div className="relative z-10 flex gap-6 border-t border-white/[0.07] px-10 py-6 text-[0.72rem] text-white/30">
            {FOOTER_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[0.72rem] font-light text-white/28 no-underline transition-colors hover:text-white/50"
              >
                {l.label}
              </Link>
            ))}
          </div>
      </div>

      <div className="flex min-h-screen flex-1 flex-col items-center justify-center overflow-y-auto bg-background px-5 py-10 sm:px-8 lg:px-8">
        <div className="mb-8 flex w-full justify-center lg:hidden">
          <Logo />
        </div>

        <AuthRedirectGate>
          {children}
        </AuthRedirectGate>
      </div>
    </div>
  );
}
