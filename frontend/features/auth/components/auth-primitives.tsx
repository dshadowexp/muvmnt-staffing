import { AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

/* ── Show/hide password toggle ── */

export function ShowHideButton({
  show,
  onToggle,
}: {
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="cursor-pointer border-none bg-transparent px-1 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
    >
      {show ? "Hide" : "Show"}
    </button>
  );
}

/* ── Error banner ── */

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-[10px] border-[1.5px] border-destructive/20 bg-destructive/5 px-3.5 py-3">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
      <p className="text-[0.835rem] leading-[1.55] text-destructive">
        {message}
      </p>
    </div>
  );
}

/* ── Success banner ── */

export function SuccessBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-[10px] border-[1.5px] border-green-500/25 bg-green-500/5 px-3.5 py-3">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
      <p className="text-[0.835rem] leading-[1.55] text-green-700 dark:text-green-400">
        {message}
      </p>
    </div>
  );
}

/* ── OR divider ── */

export function OrDivider() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[0.72rem] font-light tracking-wide text-muted-foreground">
        OR
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

/* ── Legal note ── */

export function AuthLegalNote() {
  return (
    <p className="text-center text-[0.72rem] font-light leading-[1.65] text-muted-foreground">
      By continuing, you agree to Muvmnt&apos;s{" "}
      <Link href="/privacy" className="text-primary no-underline hover:underline">
        Privacy Policy
      </Link>{" "}
      and{" "}
      <Link href="/terms" className="text-primary no-underline hover:underline">
        Terms of Use
      </Link>
      .
    </p>
  );
}
