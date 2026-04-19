import Handlebars from "handlebars";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Lazily resolved root of the Handlebars templates directory.
 *
 * Supports two runtimes with different packaging semantics:
 *   - Next.js (dev + prod): templates live alongside this source file, so
 *     `__dirname` (or its ESM equivalent) resolves correctly.
 *   - Trigger.dev (bundled worker): the `additionalFiles` build extension
 *     copies the templates tree relative to the project root (`frontend/`),
 *     so we probe `process.cwd()` as a fallback.
 *
 * A per-process override is also available via
 * `NOTIFICATION_TEMPLATES_DIR` for unusual deploy layouts.
 */
let cachedTemplatesDir: string | null = null;
function resolveTemplatesDir(): string {
    if (cachedTemplatesDir) return cachedTemplatesDir;

    const envOverride = process.env.NOTIFICATION_TEMPLATES_DIR?.trim();
    if (envOverride && existsSync(envOverride)) {
        cachedTemplatesDir = envOverride;
        return envOverride;
    }

    let sourceDir: string | null = null;
    try {
        sourceDir = dirname(fileURLToPath(import.meta.url));
    } catch {
        sourceDir = typeof __dirname !== "undefined" ? __dirname : null;
    }

    const candidates = [
        sourceDir ? join(sourceDir, "templates") : null,
        join(process.cwd(), "features/notifications/templates"),
        join(process.cwd(), "frontend/features/notifications/templates"),
    ].filter((p): p is string => typeof p === "string");

    for (const c of candidates) {
        if (existsSync(c)) {
            cachedTemplatesDir = c;
            return c;
        }
    }

    throw new Error(
        `Notification templates directory not found. Tried: ${candidates.join(", ")}. ` +
            `Set NOTIFICATION_TEMPLATES_DIR to override.`,
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

Handlebars.registerHelper("upper", (str: string) => str?.toUpperCase());
Handlebars.registerHelper("lower", (str: string) => str?.toLowerCase());
Handlebars.registerHelper("currency", (amount: number, currency = "USD") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount),
);
Handlebars.registerHelper("date", (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" }),
);
Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);
Handlebars.registerHelper("not", (a: unknown) => !a);

// ─── Partials ─────────────────────────────────────────────────────────────────

let partialsRegistered = false;
function ensurePartialsRegistered(): void {
    if (partialsRegistered) return;
    const basePath = join(resolveTemplatesDir(), "email", "base.hbs");
    if (!Handlebars.partials["email-base"] && existsSync(basePath)) {
        Handlebars.registerPartial("email-base", readFileSync(basePath, "utf-8"));
    }
    partialsRegistered = true;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const cache = new Map<string, HandlebarsTemplateDelegate>();

function loadTemplate(channel: string, name: string): HandlebarsTemplateDelegate {
    ensurePartialsRegistered();
    const cacheKey = `${channel}:${name}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const filePath = join(resolveTemplatesDir(), channel, `${name}.hbs`);
    const source = readFileSync(filePath, "utf-8");
    const compiled = Handlebars.compile(source);

    cache.set(cacheKey, compiled);
    return compiled;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function renderEmail(template: string, data: Record<string, unknown>): string {
    return loadTemplate("email", template)(data);
}

export function renderSms(template: string, data: Record<string, unknown>): string {
    return loadTemplate("sms", template)(data);
}

export function renderPush(
    template: string,
    data: Record<string, unknown>,
): { title: string; body: string } {
    const raw = loadTemplate("push", template)(data);
    return JSON.parse(raw) as { title: string; body: string };
}
