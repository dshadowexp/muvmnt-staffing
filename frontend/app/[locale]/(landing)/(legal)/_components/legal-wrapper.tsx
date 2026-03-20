import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";


interface LegalSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface LegalPageLayoutProps {
  title: string;
  subtitle: string;
  effectiveDate: string;
  lastUpdated: string;
  sections: LegalSection[];
  relatedLink: { label: string; href: string };
}

export default function LegalWrapper({
  title,
  subtitle,
  effectiveDate,
  lastUpdated,
  sections,
  relatedLink,
}: LegalPageLayoutProps) {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[var(--charcoal)] px-6 pb-[72px] pt-16 lg:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_50%,rgba(13,148,136,0.12)_0%,transparent_60%),linear-gradient(135deg,#0f1a18_0%,#0a1e1c_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(13,148,136,0.04)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="mb-8 flex items-center gap-2 text-xs font-light text-white/35">
            <Link href="/" className="text-white/40 no-underline transition-colors hover:text-white/60">
              Home
            </Link>
            <span>/</span>
            <span className="text-[var(--teal-mid)]">{title}</span>
          </div>

          <Badge className="mb-5 gap-1.5 border border-[rgba(13,148,136,0.3)] bg-[rgba(13,148,136,0.15)] text-[var(--teal-mid)]">
            Legal Document
          </Badge>

          <h1 className="mb-4 font-[var(--font-display)] text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.1] tracking-tight text-white">
            {title}
          </h1>
          <p className="mb-7 max-w-xl text-base font-light leading-relaxed text-white/55">
            {subtitle}
          </p>

          <div className="flex flex-wrap gap-3">
            {[
              { label: "Effective", value: effectiveDate },
              { label: "Last Updated", value: lastUpdated },
              { label: "Jurisdiction", value: "Canada" },
            ].map((b) => (
              <div
                key={b.label}
                className="flex items-center gap-1.5 rounded-lg border border-[rgba(13,148,136,0.2)] bg-white/5 px-3.5 py-2"
              >
                <span className="text-[0.72rem] text-white/35">{b.label}:</span>
                <span className="text-[0.78rem] font-semibold text-white/75">{b.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-background px-6 py-[72px] lg:px-12 lg:pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[240px_1fr] lg:gap-14">
            {/* Sticky TOC */}
            <nav className="top-[90px] lg:sticky">
              <Card className="p-0">
                <div className="border-b border-border px-5 py-3">
                  <h3 className="font-[var(--font-display)] text-xs font-bold uppercase tracking-[1px] text-foreground">
                    Contents
                  </h3>
                </div>
                {sections.map((s, i) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="flex items-start gap-2.5 px-5 py-2 text-[0.8rem] leading-snug text-muted-foreground no-underline transition-colors hover:bg-primary/5 hover:text-primary"
                  >
                    <span className="mt-px shrink-0 font-[var(--font-display)] text-[0.7rem] font-bold text-primary/60">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {s.title}
                  </a>
                ))}
                <div className="h-1" />
              </Card>

              <Card className="mt-4 p-0">
                <CardContent className="p-4">
                  <p className="mb-2 text-xs text-muted-foreground">Also see:</p>
                  <Link
                    href={relatedLink.href}
                    className="flex items-center gap-1 text-sm font-semibold text-primary no-underline transition-colors hover:text-primary/80"
                  >
                    {relatedLink.label} →
                  </Link>
                </CardContent>
              </Card>

              <Card className="mt-3 border-primary/20 bg-primary/5 p-0">
                <CardContent className="p-4">
                  <h4 className="mb-1.5 font-[var(--font-display)] text-sm font-bold text-foreground">
                    Questions?
                  </h4>
                  <p className="mb-2 text-xs font-light leading-snug text-muted-foreground">
                    Contact our Privacy Officer
                  </p>
                  <a
                    href="mailto:privacy@muvmnt.ca"
                    className="text-xs font-semibold text-primary no-underline transition-colors hover:text-primary/80"
                  >
                    privacy@muvmnt.ca
                  </a>
                </CardContent>
              </Card>
            </nav>

            {/* Document body */}
            <div className="min-w-0">
              {sections.map((s, i) => (
                <Card
                  key={s.id}
                  id={s.id}
                  className="mb-5 scroll-mt-[100px] p-0"
                >
                  <CardContent className="px-8 py-9 lg:px-10">
                    <div className="mb-5 flex items-start gap-3.5">
                      <Badge
                        variant="outline"
                        className="mt-0.5 shrink-0 border-border bg-primary/5 font-[var(--font-display)] text-[0.7rem] font-extrabold text-primary"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </Badge>
                      <h2 className="font-[var(--font-display)] text-lg font-extrabold tracking-tight text-foreground">
                        {s.title}
                      </h2>
                    </div>
                    <div className="prose prose-sm max-w-none text-muted-foreground prose-headings:font-[var(--font-display)] prose-headings:font-bold prose-headings:text-foreground prose-h3:mt-6 prose-h3:mb-2.5 prose-h3:text-[0.95rem] prose-p:font-light prose-p:leading-[1.8] prose-a:font-medium prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:font-semibold prose-strong:text-foreground prose-li:leading-7 prose-ul:pl-6 prose-ol:pl-6">
                      {s.content}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Footer notice */}
              <div className="mt-2 flex items-center gap-4 rounded-2xl bg-[var(--charcoal)] p-7">
                <div>
                  <p className="mb-1 font-[var(--font-display)] text-[0.95rem] font-bold text-white">
                    This document does not constitute legal advice.
                  </p>
                  <p className="text-sm font-light leading-relaxed text-white/45">
                    Muvmnt Staffing Inc. recommends that clients and professionals
                    seek independent legal counsel for matters specific to their
                    situation. For questions about this document, contact{" "}
                    <a href="mailto:legal@muvmnt.ca" className="text-[var(--teal-mid)] no-underline hover:underline">
                      legal@muvmnt.ca
                    </a>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
