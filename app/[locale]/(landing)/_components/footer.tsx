import { getTranslations } from "next-intl/server";
import { Separator } from "@/components/ui/separator";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SITE_NAME, SITE_EMAIL } from "@/lib/constants";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "@/i18n/navigation";

type FooterColumn = {
  title: string;
  links: Array<{ label: string; href: string }>;
};

export default async function Footer() {
  const tFooter = await getTranslations("footer");
  const tSite = await getTranslations("site");
  const tLegal = await getTranslations("footer.legal");

  const columns: FooterColumn[] = [
    {
      title: tFooter("columns.facilities.title"),
      links: tFooter.raw("columns.facilities.links") as FooterColumn["links"],
    },
    {
      title: tFooter("columns.professionals.title"),
      links: tFooter.raw("columns.professionals.links") as FooterColumn["links"],
    },
    {
      title: tFooter("columns.company.title"),
      links: tFooter.raw("columns.company.links") as FooterColumn["links"],
    },
  ];

  const legalLinks = [
    { label: tLegal("privacy"), href: "/privacy" },
    { label: tLegal("terms"), href: "/terms" },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-white/5 bg-[var(--charcoal)] px-6 pb-10 pt-[72px] lg:px-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_50%,rgba(13,148,136,0.18)_0%,transparent_60%),radial-gradient(ellipse_40%_40%_at_20%_80%,rgba(20,184,166,0.10)_0%,transparent_50%),linear-gradient(135deg,#0f1a18_0%,#0d2420_50%,#0a1f1c_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(13,148,136,0.05)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-10 pb-14 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:gap-16">
          <div>
            <div className="mb-4 font-[var(--font-display)] text-2xl font-extrabold text-white">
              {SITE_NAME.toLowerCase()}
              <span className="text-[var(--teal-mid)]">.</span>
            </div>

            <p className="text-sm font-light leading-7 text-white/40">
              {tFooter("brandDescription")}
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <a
                href={`mailto:${SITE_EMAIL}`}
                className="text-sm text-white/50 no-underline transition-colors hover:text-[var(--teal-mid)]"
              >
                {SITE_EMAIL}
              </a>
              <span className="text-xs font-light text-white/25">
                {tSite("countries")}
              </span>
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <div className="mb-5 font-[var(--font-display)] text-sm font-bold tracking-wide text-white">
                {col.title}
              </div>
              <div className="flex flex-col gap-3">
                {col.links.map((link) => (
                  <Link
                    key={link.href}
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

        <div className="flex flex-wrap items-center justify-between gap-4 pt-8">
          <span className="text-xs font-light text-white/25">
            {tSite("copyright", { year: new Date().getFullYear() })}
          </span>
          <div className="flex items-center gap-6">
            {legalLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-xs text-white/30 no-underline transition-colors hover:text-[var(--teal-mid)]"
              >
                {l.label}
              </Link>
            ))}
            <LanguageSwitcher variant="outline" />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
