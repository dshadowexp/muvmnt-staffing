import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import {
    NON_ORG_PREFIXES,
    PUBLIC_PATHS,
    INACTIVE_PREFIXES,
    WORKER_DASHBOARD_PREFIXES,
    CLIENT_DASHBOARD_PREFIXES,
    ADMIN_DASHBOARD_PREFIXES
} from './lib/constants';
import { UserAuth, UserRole } from './types/auth';
import arcjet, { detectBot, shield, slidingWindow } from "@/services/arcjet/client";

const aj = arcjet.withRule(
        shield({ mode: "LIVE" })
    ).withRule(
        detectBot({
            mode: "LIVE",
            allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:MONITOR", "CATEGORY:PREVIEW"],
        })
    ).withRule(
        slidingWindow({
            mode: "LIVE",
            interval: "1m",
            max: 100,
        })
    );

const intlMiddleware = createMiddleware(routing);

function stripLocaleFromPathname(pathname: string): string {
    for (const locale of routing.locales) {
        const prefix = `/${locale}`;
        if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
            const rest = pathname.slice(prefix.length);
            return rest === '' ? '/' : rest;
        }
    }
    return pathname;
}

function pathHasPrefix(pathname: string, prefix: string): boolean {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function getSessionFromRequest(req: NextRequest): UserAuth | null {
    const session = req.cookies.get("session")?.value;
    if (!session) return null;
    try {
        return JSON.parse(session) as UserAuth;
    } catch {
        return null;
    }
}

function isPublicRoute(pathnameWithoutLocale: string): boolean {
    const exactMatch = PUBLIC_PATHS.includes(pathnameWithoutLocale);
    const prefixMatch = NON_ORG_PREFIXES.some((p) => pathnameWithoutLocale.startsWith(p));
    return exactMatch || prefixMatch;
}

function isInactiveRoute(pathname: string): boolean {
    return INACTIVE_PREFIXES.some((p) => pathHasPrefix(pathname, p));
}

function isNotRoleDashboardRoute(pathname: string, role: UserRole): boolean {
    if (role === "worker") {
        console.log('worker', pathname, !WORKER_DASHBOARD_PREFIXES.some((p) => pathHasPrefix(pathname, p)));
        return !WORKER_DASHBOARD_PREFIXES.some((p) => pathHasPrefix(pathname, p));
    }
    if (role === "client") {
        return !CLIENT_DASHBOARD_PREFIXES.some((p) => pathHasPrefix(pathname, p));
    }
    if (role === "admin") {
        return !ADMIN_DASHBOARD_PREFIXES.some((p) => pathHasPrefix(pathname, p));
    }
    return false;
}

function safeRedirectParam(raw: string | null): string | null {
    if (!raw) return null;
    // only allow same-origin, absolute path redirects
    if (!raw.startsWith('/') || raw.startsWith('//')) return null;

    return raw;
}

export async function proxy(req: NextRequest) {
    console.log("proxy", req.url);
    const decision = await aj.protect(req);
    if (decision.isDenied()) {
        return NextResponse.json(
            { error: "Forbidden", reason: decision.reason }, 
            { status: 403 }
        );
    }

    const { pathname, search } = req.nextUrl;

    if (pathname.startsWith('/api') || pathname.startsWith('/trpc')) {
        return NextResponse.next();
    }

    const pathForRules = stripLocaleFromPathname(pathname);
    const session = getSessionFromRequest(req);

    if (isPublicRoute(pathForRules)) {
        return intlMiddleware(req);
    }

    if (!session) {
        const authRoute = pathHasPrefix(pathForRules, '/sign-up') ? '/sign-up' : '/sign-in';
        const signinUrl = new URL(authRoute, req.url);
        signinUrl.searchParams.set('redirect', pathname + search);
        return NextResponse.redirect(signinUrl);
    }

    if (!session.isActive) {
        if (!isInactiveRoute(pathForRules)) {
            const redirectParam = safeRedirectParam(
                req.nextUrl.searchParams.get('redirect'),
            );

            return NextResponse.redirect(new URL('/review', req.url));
        } else {
            return intlMiddleware(req);
        }
    }

    console.log("checking dashboard");

    if (isNotRoleDashboardRoute(pathForRules, session.role)) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return intlMiddleware(req);
}

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        // Always run for API routes
        "/(api|trpc)(.*)",
    ],
};
