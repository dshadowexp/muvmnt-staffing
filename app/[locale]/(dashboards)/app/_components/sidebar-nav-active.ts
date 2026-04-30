import { cn } from "@/lib/utils";

/** Strip trailing slash except for root. */
export function normalizePath(path: string): string {
  const p = (path || "/").trim();
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p || "/";
}

/** `usePathname()` may rarely include a locale segment; nav `href`s do not. */
function pathnameForNavMatch(pathname: string): string {
  let p = normalizePath(pathname);
  p = p.replace(/^\/(en|fr)(?=\/|$)/i, "");
  if (p === "") p = "/";
  return normalizePath(p);
}

function segmentCount(path: string): number {
  return normalizePath(path).split("/").filter(Boolean).length;
}

/**
 * Which `candidateHrefs` should show as active for `pathname`.
 * - Exact match wins.
 * - Otherwise longest href with ≥2 path segments that is a strict prefix of pathname
 *   (so `/client` does not stay active on `/client/requests/...`).
 */
export function resolveActiveNavHref(
  pathname: string,
  candidateHrefs: string[],
): string | null {
  const p = pathnameForNavMatch(pathname);
  const uniq = [
    ...new Set(
      candidateHrefs.filter((h) => typeof h === "string" && h.startsWith("/")),
    ),
  ];

  const exact = uniq.find((h) => normalizePath(h) === p);
  if (exact) return exact;

  const sorted = [...uniq].sort(
    (a, b) => normalizePath(b).length - normalizePath(a).length,
  );

  for (const href of sorted) {
    if (segmentCount(href) < 2) continue;
    const h = normalizePath(href);
    if (p.startsWith(`${h}/`)) return href;
  }

  return null;
}

/**
 * Shared base for every dashboard sidebar row.
 *
 * - Unified height/padding/radius so rows line up cleanly.
 * - Single `transition-colors` bundle for fast, paint-friendly hover.
 * - Explicit focus ring tied to the `border` token (not the brand sidebar ring)
 *   so keyboard focus reads as a neutral outline rather than a green glow.
 */
const navItemBase = cn(
  "group/nav-item relative h-9 rounded-lg px-3 text-sm font-medium",
  "transition-colors duration-150 ease-out",
  "outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0",
);

/** Idle row — muted text + icon, subtle hover fill. */
const navItemInactive = cn(
  navItemBase,
  "!bg-transparent text-muted-foreground [&_svg]:text-muted-foreground",
  "hover:!bg-muted/60 hover:text-foreground hover:[&_svg]:text-foreground",
  "active:!bg-muted/80",
  "dark:hover:!bg-muted/40",
);

/**
 * Active row — primary-tinted fill with a leading accent bar on the left edge
 * (via `::before`) for a modern, clearly-selected feel.
 */
const navItemActive = cn(
  navItemBase,
  "!bg-primary/10 font-semibold text-primary [&_svg]:text-primary",
  "hover:!bg-primary/15 hover:text-primary hover:[&_svg]:text-primary",
  "dark:!bg-primary/15 dark:hover:!bg-primary/20",
  "before:pointer-events-none before:absolute before:left-1 before:top-1/2 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-primary",
);

/**
 * `SidebarMenuButton` classNames for dashboard sidebar links.
 * Centralizes active vs inactive so main + secondary nav stay in sync.
 */
export function sidebarNavItemClassName(isActive: boolean): string {
  return isActive ? navItemActive : navItemInactive;
}
