import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { NON_ORG_PREFIXES, PUBLIC_PATHS } from './lib/constants';
import { getSession } from './lib/session';

const intlMiddleware = createMiddleware(routing);

export async function proxy(req: NextRequest) {
    const { pathname, search } = req.nextUrl;
    const isPublic = PUBLIC_PATHS.includes(pathname);
    const isNonOrgPath = NON_ORG_PREFIXES.some((p) => pathname.startsWith(p));

    // Authentication check
    // request.cookies is the middleware-native API — no import needed
    // Get all cookies

    // Read a specific cookie
    const cookieSession = await getSession();
    const isAuthed = !!cookieSession;

    if (!isPublic && !cookieSession) {
        const signinUrl = new URL('/sign-in', req.url);
        signinUrl.searchParams.set('redirect', pathname + search);
        return NextResponse.redirect(signinUrl);
    }

    if (isPublic || isNonOrgPath) {
        return intlMiddleware(req);
    }

    // ── 5. Protected route, no session → redirect to sign-in ─────────────────
    if (!isAuthed) {
        console.log('isAuthed is false, redirecting to sign-in');
        const signInUrl = new URL('/sign-in', req.url);
        if (pathname !== '/') signInUrl.searchParams.set('redirect', pathname + search);
        return NextResponse.redirect(signInUrl);
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