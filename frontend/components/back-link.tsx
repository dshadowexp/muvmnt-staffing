import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function BackLink({
  backHref,
  title,
  className,
}: {
  backHref: string;
  title: string;
  className?: string;
}) {
  return (
    <Link
      href={backHref}
      className={cn(
        "text-muted-foreground hover:text-foreground -ml-1 inline-flex items-center gap-2 rounded-md py-1.5 pr-2 text-sm transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
        className,
      )}
    >
      <ArrowLeft className="size-4 shrink-0" aria-hidden />
      <span>{title}</span>
    </Link>
  );
}
