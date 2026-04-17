import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import {
    NON_ORG_PREFIXES,
    PUBLIC_PATHS,
    ADMIN_PREFIXES,
    WORKER_PREFIXES,
    CLIENT_PREFIXES,
    AUTH_PREFIXES
} from './lib/constants';
import { UserAuth } from './types/auth';

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

const ROLE_ROUTES: Record<string, string[]> = {
    admin: ADMIN_PREFIXES,
    worker: WORKER_PREFIXES,
    client: CLIENT_PREFIXES,
};

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

function isRoleRouteAllowed(pathname: string, role: string): boolean {
    const allowedPaths = ROLE_ROUTES[role] ?? [];
    return allowedPaths.some((p) => pathHasPrefix(pathname, p));
}

function isAuthRoute(pathname: string): boolean {
    return AUTH_PREFIXES.some((p) => pathHasPrefix(pathname, p));
}

function safeRedirectParam(raw: string | null): string | null {
    if (!raw) return null;
    // only allow same-origin, absolute path redirects
    if (!raw.startsWith('/') || raw.startsWith('//')) return null;
    // don't bounce them back to an auth route
    const stripped = stripLocaleFromPathname(raw.split('?')[0] ?? raw);
    if (isAuthRoute(stripped)) return null;
    return raw;
}

export async function proxy(req: NextRequest) {
    const { pathname, search } = req.nextUrl;

    if (pathname.startsWith('/api') || pathname.startsWith('/trpc')) {
        return NextResponse.next();
    }

    const pathForRules = stripLocaleFromPathname(pathname);
    const session = getSessionFromRequest(req);

    if (session && isAuthRoute(pathForRules)) {
        const redirectParam = safeRedirectParam(
            req.nextUrl.searchParams.get('redirect'),
        );
        const target = redirectParam ?? `/${session.role}`;
        return NextResponse.redirect(new URL(target, req.url));
    }

    if (isPublicRoute(pathForRules)) {
        return intlMiddleware(req);
    }

    if (!session) {
        const signinUrl = new URL('/sign-in', req.url);
        signinUrl.searchParams.set('redirect', pathname + search);
        return NextResponse.redirect(signinUrl);
    }

    const role = session.role;
    if (!isRoleRouteAllowed(pathForRules, role)) {
        return NextResponse.redirect(new URL(`/${role}`, req.url));
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
