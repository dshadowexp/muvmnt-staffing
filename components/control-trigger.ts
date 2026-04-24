/**
 * Shared trigger styles for compact "utility" controls that appear in both
 * light surfaces (navbar, light sections) and dark surfaces (footer, hero).
 *
 * Both LanguageSwitcher and ThemeToggle render as rounded-full pill triggers
 * using these classes so they look like a coherent pair wherever they are
 * placed.
 */
export type ControlTone = "default" | "on-dark";

export const controlTriggerStyles: Record<ControlTone, string> = {
  default:
    "border-border bg-background/60 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
  "on-dark":
    "border-white/10 bg-white/[0.04] text-white/75 hover:border-white/15 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
};

/**
 * Square circular icon-button style that pairs with the LanguageSwitcher /
 * ThemeToggle pill triggers. Use for header utility icons (notifications,
 * install app, feedback, user avatar, etc.) so the whole cluster reads as a
 * coherent row of circular controls.
 */
export const controlIconButtonClassName =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";
