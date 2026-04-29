/**
 * Shared Tailwind className strings for CTA links across all landing pages.
 *
 * Using plain <Link> elements instead of <Button asChild> keeps the rendered
 * HTML as a single <a> tag — no extra wrapper, better Lighthouse scores, and
 * aligned with Next.js best-practices for navigation.
 */

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/** Full-height (h-11) primary solid — works on any background. */
export const ctaPrimary = `${base} h-11 bg-primary px-8 text-primary-foreground shadow-sm hover:bg-primary/90`;

/** Full-height (h-11) outlined — for light / card backgrounds. */
export const ctaOutline = `${base} h-11 border border-border px-8 text-foreground hover:bg-muted`;

/** Full-height (h-11) outlined — for dark / charcoal backgrounds. */
export const ctaOutlineDark = `${base} h-11 border border-white/20 px-8 text-white hover:bg-white/10`;

/** Compact (h-9) outlined — for inline / secondary links on light backgrounds. */
export const ctaOutlineSm = `${base} h-9 border border-border px-4 font-medium hover:bg-muted`;

/** Compact (h-9) primary solid — for navbar / tight spaces. */
export const ctaPrimarySm = `${base} h-9 bg-primary px-4 text-primary-foreground shadow-sm hover:bg-primary/90`;

/** Compact (h-9) ghost — subtle hover, for secondary nav actions. */
export const ctaGhostSm = `${base} h-9 px-4 text-muted-foreground hover:bg-muted hover:text-foreground`;
