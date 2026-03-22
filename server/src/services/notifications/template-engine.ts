import Handlebars from 'handlebars'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const TEMPLATES_DIR = join(__dirname, 'templates');

// ─── Helpers ──────────────────────────────────────────────────────────────────

Handlebars.registerHelper('upper', (str: string) => str?.toUpperCase())
Handlebars.registerHelper('lower', (str: string) => str?.toLowerCase())
Handlebars.registerHelper('currency', (amount: number, currency = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
);
Handlebars.registerHelper('date', (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { dateStyle: 'medium' })
);
Handlebars.registerHelper('eq',  (a: unknown, b: unknown) => a === b);
Handlebars.registerHelper('not', (a: unknown) => !a);

// ─── Partials ─────────────────────────────────────────────────────────────────
// Register base layout once so all email templates can use {{> email-base}}

function registerPartial(name: string, filePath: string): void {
    if (Handlebars.partials[name]) return; // already registered
    const source = readFileSync(filePath, 'utf-8');
    Handlebars.registerPartial(name, source);
}

registerPartial('email-base', join(TEMPLATES_DIR, 'email', 'base.hbs'))

// ─── Cache ────────────────────────────────────────────────────────────────────

const cache = new Map<string, HandlebarsTemplateDelegate>();

function loadTemplate(channel: string, name: string): HandlebarsTemplateDelegate {
    const cacheKey = `${channel}:${name}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey)!;

    const filePath = join(TEMPLATES_DIR, channel, `${name}.hbs`);
    const source   = readFileSync(filePath, 'utf-8');
    const compiled = Handlebars.compile(source);

    cache.set(cacheKey, compiled);
    return compiled;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function renderEmail(template: string, data: Record<string, unknown>): string {
    return loadTemplate('email', template)(data);
}

export function renderSms(template: string, data: Record<string, unknown>): string {
    return loadTemplate('sms', template)(data);
}

export function renderPush(
  template: string,
  data: Record<string, unknown>
): { title: string; body: string } {
    const raw    = loadTemplate('push', template)(data);
    const parsed = JSON.parse(raw) as { title: string; body: string };
    return parsed;
}