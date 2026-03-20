import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SITE_NAME, SITE_EMAIL, SITE_PHONE, SITE_PROVINCES } from "@/lib/constants";

const FOOTER_COLS = [
  {
    title: "Services",
    links: [
      { label: "Temporary Staffing", href: "/#services" },
      { label: "Home Care Staffing", href: "/#services" },
      { label: "Emergency Relief", href: "/#services" },
      { label: "Request Talent", href: "/#contact" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/#contact" },
    ],
  },
  {
    title: "For Professionals",
    links: [
      { label: "Find Work", href: "/find-work" },
      { label: "Submit Resume", href: "/find-work#apply" },
      { label: "FAQ", href: "/faq" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/5 bg-[var(--charcoal)] px-6 pb-10 pt-[72px] lg:px-12">
      {/* Background gradient layer (matches hero) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_50%,rgba(13,148,136,0.18)_0%,transparent_60%),radial-gradient(ellipse_40%_40%_at_20%_80%,rgba(20,184,166,0.10)_0%,transparent_50%),linear-gradient(135deg,#0f1a18_0%,#0d2420_50%,#0a1f1c_100%)]" />

      {/* Grid pattern layer */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(13,148,136,0.05)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Top grid */}
        <div className="grid grid-cols-1 gap-10 pb-14 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:gap-16">
          {/* Brand column */}
          <div>
            <div className="mb-4 font-[var(--font-display)] text-2xl font-extrabold text-white">
              {SITE_NAME.toLowerCase()}
              <span className="text-[var(--teal-mid)]">.</span>
            </div>

            <p className="text-sm font-light leading-7 text-white/40">
              Canada&apos;s modern healthcare staffing partner. Connecting
              facilities with credentialed professionals — fast, reliably, and
              with care.
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <a
                href={`mailto:${SITE_EMAIL}`}
                className="text-sm text-white/50 no-underline transition-colors hover:text-[var(--teal-mid)]"
              >
                {SITE_EMAIL}
              </a>
              <a
                href={`tel:${SITE_PHONE}`}
                className="text-sm text-white/50 no-underline transition-colors hover:text-[var(--teal-mid)]"
              >
                {SITE_PHONE}
              </a>
              <span className="text-xs font-light text-white/25">
                {SITE_PROVINCES}
              </span>
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <div className="mb-5 font-[var(--font-display)] text-sm font-bold tracking-wide text-white">
                {col.title}
              </div>
              <div className="flex flex-col gap-3">
                {col.links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-sm font-light text-white/40 no-underline transition-colors hover:text-[var(--teal-mid)]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Separator className="bg-white/5" />

        {/* Bottom bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-8">
          <span className="text-xs font-light text-white/25">
            © {new Date().getFullYear()} Muvmnt Staffing Inc. All rights
            reserved.
          </span>
          <div className="flex items-center gap-6">
            {[
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Terms of Use", href: "/terms" },
            ].map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-xs text-white/30 no-underline transition-colors hover:text-[var(--teal-mid)]"
              >
                {l.label}
              </Link>
            ))}
            <LanguageSwitcher variant="outline" />
          </div>
        </div>
      </div>
    </footer>
  );
}
