import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { ArrowLeftIcon } from "lucide-react";
import type { ReactNode } from "react";

export function AdminDetailHeader({
  backHref,
  backLabel = "Back",
  eyebrow,
  title,
  meta,
  actions,
}: {
  backHref: string;
  backLabel?: string;
  eyebrow?: string;
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={backHref}>
            <ArrowLeftIcon className="size-4" aria-hidden />
            {backLabel}
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="space-y-1">
          {eyebrow ? (
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            {title}
          </h1>
          {meta ? (
            <p className="text-muted-foreground text-sm">{meta}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function AdminDetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[minmax(8rem,12rem)_1fr] sm:gap-4">
      <dt className="text-muted-foreground text-sm font-medium">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}
