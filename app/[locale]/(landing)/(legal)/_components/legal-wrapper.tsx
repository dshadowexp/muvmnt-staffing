import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export type LegalSection = {
  id: string;
  title: string;
  /** Static HTML for inline links (e.g. third-party legal). Supersedes paragraphs/bullets/groups/note when set. */
  html?: string;
  paragraphs?: string[];
  bullets?: string[];
  groups?: { heading: string; bullets: string[] }[];
  note?: string;
};

export type LegalStrings = {
  breadcrumb: string;
  home: string;
  badge: string;
  jurisdiction: string;
  effectiveLabel: string;
  updatedLabel: string;
  contactHeading: string;
  contactBody: string;
  disclaimer: string;
};

interface LegalWrapperProps {
  title: string;
  subtitle: string;
  effectiveDate: string;
  lastUpdated: string;
  sections: LegalSection[];
  related: { label: string; href: string };
  contactEmail: string;
  strings: LegalStrings;
}

export default function LegalWrapper({
  title,
  subtitle,
  effectiveDate,
  lastUpdated,
  sections,
  related,
  contactEmail,
  strings,
}: LegalWrapperProps) {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-[var(--charcoal)] px-6 pb-16 pt-10 lg:px-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_50%,rgba(13,148,136,0.12)_0%,transparent_60%),linear-gradient(135deg,#0f1a18_0%,#0d2420_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(13,148,136,0.04)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="mb-6 flex items-center gap-2 text-xs font-light text-white/35">
            <Link
              href="/"
              className="text-white/40 no-underline transition-colors hover:text-white/60"
            >
              {strings.home}
            </Link>
            <span>/</span>
            <span className="text-primary">{strings.breadcrumb}</span>
          </div>

          <Badge className="mb-4 gap-1.5 border border-[rgba(13,148,136,0.3)] bg-[rgba(13,148,136,0.15)] text-primary">
            {strings.badge}
          </Badge>

          <h1 className="font-[var(--font-display)] text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base font-light leading-relaxed text-white/65">
            {subtitle}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <MetaChip label={strings.effectiveLabel} value={effectiveDate} />
            <MetaChip label={strings.updatedLabel} value={lastUpdated} />
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-3xl px-6 py-14 lg:px-8">
        <Accordion
          type="single"
          collapsible
          defaultValue={sections[0]?.id}
          className="bg-card"
        >
          {sections.map((section, i) => (
            <AccordionItem
              key={section.id}
              value={section.id}
              id={section.id}
              className="scroll-mt-24"
            >
              <AccordionTrigger className="px-5 py-4 text-base font-semibold">
                <span className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{section.title}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-5 text-[0.92rem] leading-7 text-muted-foreground">
                <SectionBody section={section} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <Card className="mt-8">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {strings.contactHeading}
              </p>
              <p className="text-sm text-muted-foreground">
                {strings.contactBody}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={related.href}>{related.label}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        <p className="text-xs leading-relaxed text-muted-foreground">
          {strings.disclaimer}
        </p>
      </section>
    </>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
      {label && (
        <span className="text-[0.7rem] text-white/40">{label}:</span>
      )}
      <span className="text-[0.78rem] font-semibold text-white/80">{value}</span>
    </div>
  );
}

function SectionBody({ section }: { section: LegalSection }) {
  if (section.html) {
    return (
      <div
        className="space-y-3 [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2"
        dangerouslySetInnerHTML={{ __html: section.html }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {section.paragraphs?.map((p, i) => (
        <p key={i}>{p}</p>
      ))}

      {section.bullets && section.bullets.length > 0 && (
        <ul className="list-disc space-y-1 pl-5">
          {section.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}

      {section.groups?.map((g) => (
        <div key={g.heading} className="space-y-1.5">
          <p className="text-sm font-semibold text-foreground">{g.heading}</p>
          <ul className="list-disc space-y-1 pl-5">
            {g.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      ))}

      {section.note && (
        <div className="rounded-md border bg-primary/5 px-4 py-3 text-sm text-foreground">
          {section.note}
        </div>
      )}
    </div>
  );
}
