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

/** Shared transition for nav rows (single paint-friendly property bundle). */
const navItemTransition =
  "transition-[color,background-color,box-shadow,ring-color] duration-150 ease-out";

/**
 * Kill sidebar default `ring-sidebar-ring` (brand/green) so rings use border only.
 */
const navItemRingNeutral = cn(
  "outline-none ring-border/90 dark:ring-border/70",
  "focus-visible:!ring-1 focus-visible:!ring-border/90 focus-visible:!ring-offset-0 dark:focus-visible:!ring-border/70",
);

/**
 * Selected row look: current route uses this; idle rows use the same on hover
 * so interaction matches the earlier dashboard reference.
 */
const navItemSelected = cn(
  navItemTransition,
  navItemRingNeutral,
  "font-medium text-foreground [&_svg]:text-foreground",
  "!bg-muted/95 shadow-sm !ring-1 dark:!bg-muted/55",
);

const navItemInactive = cn(
  navItemTransition,
  navItemRingNeutral,
  "!bg-transparent text-muted-foreground shadow-none !ring-0",
  "[&_svg]:text-muted-foreground",
  "hover:font-medium hover:text-foreground hover:[&_svg]:text-foreground hover:!bg-muted/95 hover:shadow-sm hover:!ring-1 dark:hover:!bg-muted/55",
  "focus-visible:font-medium focus-visible:text-foreground focus-visible:[&_svg]:text-foreground focus-visible:!bg-muted/95 focus-visible:shadow-sm focus-visible:!ring-1 dark:focus-visible:!bg-muted/55",
  "active:font-medium active:text-foreground active:[&_svg]:text-foreground active:!bg-muted/95 active:shadow-sm active:!ring-1 dark:active:!bg-muted/55",
);

const navItemActive = cn(
  navItemSelected,
  "hover:!bg-muted/90 hover:text-foreground dark:hover:!bg-muted/60",
);

/**
 * `SidebarMenuButton` classNames for dashboard sidebar links.
 * Centralizes active vs inactive so main + secondary nav stay in sync.
 */
export function sidebarNavItemClassName(isActive: boolean): string {
  return isActive ? navItemActive : navItemInactive;
}
