import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { NON_ORG_PREFIXES, PUBLIC_PATHS } from './lib/constants';
import { UserAuth } from './types/auth';

const intlMiddleware = createMiddleware(routing);

function getSessionFromRequest(req: NextRequest): UserAuth | null {
    const session = req.cookies.get("session")?.value;
    if (!session) return null;
    try {
        return JSON.parse(session) as UserAuth;
    } catch {
        return null;
    }
}

function isPublicRoute(pathname: string): boolean {
    const exactMatch = PUBLIC_PATHS.includes(pathname);
    const prefixMatch = NON_ORG_PREFIXES.some((p) => pathname.startsWith(p));
    return exactMatch || prefixMatch;
}

export async function proxy(req: NextRequest) {
    const { pathname, search } = req.nextUrl;

    if (isPublicRoute(pathname)) {
        return intlMiddleware(req);
    }

    const session = getSessionFromRequest(req);

    if (!session) {
        const signinUrl = new URL('/sign-in', req.url);
        signinUrl.searchParams.set('redirect', pathname + search);
        return NextResponse.redirect(signinUrl);
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
}