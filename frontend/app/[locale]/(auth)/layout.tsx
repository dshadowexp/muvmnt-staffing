import Link from "next/link";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";
import { Logo } from "@/components/logo";
import { AuthRedirectGate } from "@/features/auth/components/auth-redirect-gate";

export const metadata: Metadata = {
  title: {
    default: `Account | ${SITE_NAME}`,
    template: `%s | ${SITE_NAME}`,
  },
};

const TESTIMONIAL = {
  quote:
    "Muvmnt filled three last-minute RN positions over a holiday weekend. I don't know what we would have done without them.",
  name: "Sandra K.",
  role: "Director of Care, LTC Facility — Toronto",
};

const FOOTER_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Use", href: "/terms" },
];

export default async function AuthLayout({ children }: { children: React.ReactNode; }) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-[45%] shrink-0 flex-col overflow-hidden bg-[var(--charcoal)] p-12 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_50%,rgba(13,148,136,0.18)_0%,transparent_60%),radial-gradient(ellipse_40%_40%_at_20%_80%,rgba(20,184,166,0.10)_0%,transparent_50%),linear-gradient(135deg,#0f1a18_0%,#0d2420_50%,#0a1f1c_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(13,148,136,0.05)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="relative z-10 flex h-full flex-col">
          
          <div className="flex flex-1 flex-col justify-center gap-10">
            <Logo />

            <div className="rounded-xl border border-[rgba(13,148,136,0.2)] bg-white/[0.04] p-6">
              <p className="mb-4 text-sm font-light italic leading-7 text-white/70">
                &ldquo;{TESTIMONIAL.quote}&rdquo;
              </p>
              <div className="flex items-center gap-2.5">
                <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-primary font-[var(--font-display)] text-[0.85rem] font-extrabold text-primary-foreground">
                  {TESTIMONIAL.name[0]}
                </div>
                <div>
                  <p className="text-[0.82rem] font-semibold text-white">
                    {TESTIMONIAL.name}
                  </p>
                  <p className="text-[0.72rem] font-light text-white/38">
                    {TESTIMONIAL.role}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-5 border-t border-white/[0.07] pt-6">
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
