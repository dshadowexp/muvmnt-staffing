"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderEmail = renderEmail;
exports.renderSms = renderSms;
exports.renderPush = renderPush;
const handlebars_1 = __importDefault(require("handlebars"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const TEMPLATES_DIR = (0, node_path_1.join)(__dirname, 'templates');
// ─── Helpers ──────────────────────────────────────────────────────────────────
handlebars_1.default.registerHelper('upper', (str) => str?.toUpperCase());
handlebars_1.default.registerHelper('lower', (str) => str?.toLowerCase());
handlebars_1.default.registerHelper('currency', (amount, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount));
handlebars_1.default.registerHelper('date', (iso) => new Date(iso).toLocaleDateString('en-US', { dateStyle: 'medium' }));
handlebars_1.default.registerHelper('eq', (a, b) => a === b);
handlebars_1.default.registerHelper('not', (a) => !a);
// ─── Partials ─────────────────────────────────────────────────────────────────
// Register base layout once so all email templates can use {{> email-base}}
function registerPartial(name, filePath) {
    if (handlebars_1.default.partials[name])
        return; // already registered
    const source = (0, node_fs_1.readFileSync)(filePath, 'utf-8');
    handlebars_1.default.registerPartial(name, source);
}
registerPartial('email-base', (0, node_path_1.join)(TEMPLATES_DIR, 'email', 'base.hbs'));
// ─── Cache ────────────────────────────────────────────────────────────────────
const cache = new Map();
function loadTemplate(channel, name) {
    const cacheKey = `${channel}:${name}`;
    if (cache.has(cacheKey))
        return cache.get(cacheKey);
    const filePath = (0, node_path_1.join)(TEMPLATES_DIR, channel, `${name}.hbs`);
    const source = (0, node_fs_1.readFileSync)(filePath, 'utf-8');
    const compiled = handlebars_1.default.compile(source);
    cache.set(cacheKey, compiled);
    return compiled;
}
// ─── Public API ───────────────────────────────────────────────────────────────
function renderEmail(template, data) {
    return loadTemplate('email', template)(data);
}
function renderSms(template, data) {
    return loadTemplate('sms', template)(data);
}
function renderPush(template, data) {
    const raw = loadTemplate('push', template)(data);
    const parsed = JSON.parse(raw);
    return parsed;
}
//# sourceMappingURL=template-engine.js.map