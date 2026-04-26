import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";
import {
    PUBLIC_PATHS,
    PUBLIC_PREFIXES,
    AUTH_PATHS,
    INACTIVE_PREFIXES,
    DASHBOARD_PREFIXES,
} from "./lib/constants";
import { UserAuth, UserRole } from "./features/auth/types";
import arcjet, { detectBot, shield, slidingWindow } from "@/services/arcjet/client";

const ajBase = arcjet
    .withRule(shield({ mode: "LIVE" }))
    .withRule(slidingWindow({ mode: "LIVE", interval: "1m", max: 100 }));

const ajWithBot = ajBase.withRule(detectBot({
    mode: "LIVE",
    allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:MONITOR", "CATEGORY:PREVIEW", "STRIPE_WEBHOOK", "STRIPE_CRAWLER"],
}));

const intlMiddleware = createMiddleware(routing);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripLocale(pathname: string): string {
    for (const locale of routing.locales) {
        const prefix = `/${locale}`;
        if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
            const rest = pathname.slice(prefix.length);
            return rest === "" ? "/" : rest;
        }
    }
    return pathname;
}

function hasPrefix(pathname: string, prefix: string): boolean {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function getSession(req: NextRequest): UserAuth | null {
    const raw = req.cookies.get("session")?.value;
    if (!raw) return null;
    try {
        return JSON.parse(raw) as UserAuth;
    } catch {
        return null;
    }
}

function safeRedirect(raw: string | null): string | null {
    if (!raw) return null;
    if (!raw.startsWith("/") || raw.startsWith("//")) return null;
    return raw;
}

function isPublicPath(path: string): boolean {
    return (
        PUBLIC_PATHS.has(path) ||
        PUBLIC_PREFIXES.some((p) => hasPrefix(path, p))
    );
}

function isAuthPath(path: string): boolean {
    return AUTH_PATHS.has(path) || hasPrefix(path, "/sign-up");
}

function isInactivePath(path: string): boolean {
    return INACTIVE_PREFIXES.some((p) => hasPrefix(path, p));
}

function isAllowedForRole(pathname: string, role: UserRole): boolean {
    return DASHBOARD_PREFIXES[role].some((p) => hasPrefix(pathname, p));
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function proxy(req: NextRequest) {
    const userAgent = req.headers.get("user-agent");
    const aj = userAgent ? ajWithBot : ajBase;

    const decision = await aj.protect(req);
    if (decision.isDenied()) {
        return NextResponse.json(
            { error: "Forbidden", reason: decision.reason },
            { status: 403 },
        );
    }

    const { pathname, search } = req.nextUrl;

    // API routes — skip all auth logic
    if (pathname.startsWith("/api") || pathname.startsWith("/trpc")) {
        return NextResponse.next();
    }

    const path    = stripLocale(pathname);
    const session = getSession(req);

    // Public paths — no session required
    if (isPublicPath(path)) {
        return intlMiddleware(req);
    }

    // Auth pages — redirect to dashboard if already signed in
    if (isAuthPath(path)) {
        if (session) {
            const redirectTo = safeRedirect(req.nextUrl.searchParams.get("redirect")) ?? "/dashboard";
            return NextResponse.redirect(new URL(redirectTo, req.url));
        }
        return intlMiddleware(req);
    }

    // No session → send to sign in
    if (!session) {
        const signInUrl = new URL("/sign-in", req.url);
        signInUrl.searchParams.set("redirect", pathname + search);
        return NextResponse.redirect(signInUrl);
    }

    // Inactive account → confined to onboarding/review
    if (!session.isActive) {
        if (!isInactivePath(path)) {
            return NextResponse.redirect(new URL("/review", req.url));
        }
        
        return intlMiddleware(req);
    }

    // Role guard → bounce to own dashboard root if accessing wrong role's area
    if (!isAllowedForRole(path, session.role)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return intlMiddleware(req);
}

export const config = {
    matcher: [
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        "/(api|trpc)(.*)",
    ],
};