import type { Auth } from "firebase-admin/auth";
import * as client from "openid-client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { customFirebaseAdminInit, getAdminAuth } from "@/services/firebase/admin";
import { env } from "@/data/env/server";
import {
  LINKEDIN_FIREBASE_HANDOFF_COOKIE,
  LINKEDIN_OAUTH_STATE_COOKIE,
} from "@/lib/constants";

customFirebaseAdminInit();

/** LinkedIn OIDC / OAuth 2.0 metadata (manual config avoids discovery issuer mismatches). */
const linkedInServerMetadata = {
  issuer: "https://www.linkedin.com/oauth",
  authorization_endpoint: "https://www.linkedin.com/oauth/v2/authorization",
  token_endpoint: "https://www.linkedin.com/oauth/v2/accessToken",
  userinfo_endpoint: "https://api.linkedin.com/v2/userinfo",
  jwks_uri: "https://www.linkedin.com/oauth/openid/jwks",
} satisfies client.ServerMetadata;

type LinkedInIdClaims = {
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
  given_name?: unknown;
  family_name?: unknown;
  picture?: unknown;
};

function displayNameFromLinkedInClaims(c: LinkedInIdClaims): string | undefined {
  if (typeof c.name === "string" && c.name.trim()) return c.name.trim();
  const parts = [c.given_name, c.family_name].filter(
    (p): p is string => typeof p === "string" && p.trim().length > 0,
  );
  if (parts.length === 0) return undefined;
  return parts.join(" ").trim();
}

/** Ensures Firebase Auth user row has profile fields (Console + client user object). */
async function ensureFirebaseUserFromLinkedIn(
  auth: Auth,
  uid: string,
  claims: LinkedInIdClaims,
): Promise<void> {
  const email = typeof claims.email === "string" ? claims.email.trim() : undefined;
  const displayName = displayNameFromLinkedInClaims(claims);
  const photoURL =
    typeof claims.picture === "string" && claims.picture.trim()
      ? claims.picture.trim()
      : undefined;
  const emailVerified =
    claims.email_verified === true || claims.email_verified === "true";

  const withEmail = {
    ...(email ? { email } : {}),
    ...(email ? { emailVerified } : {}),
    ...(displayName ? { displayName } : {}),
    ...(photoURL ? { photoURL } : {}),
  };

  const withoutEmail = {
    ...(displayName ? { displayName } : {}),
    ...(photoURL ? { photoURL } : {}),
  };

  try {
    await auth.getUser(uid);
    try {
      await auth.updateUser(uid, withEmail);
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === "auth/email-already-exists") {
        await auth.updateUser(uid, withoutEmail);
      } else {
        throw e;
      }
    }
  } catch (e: unknown) {
    if ((e as { code?: string })?.code !== "auth/user-not-found") throw e;
    try {
      await auth.createUser({ uid, ...withEmail });
    } catch (e2: unknown) {
      if ((e2 as { code?: string })?.code === "auth/email-already-exists") {
        await auth.createUser({ uid, ...withoutEmail });
      } else {
        throw e2;
      }
    }
  }
}

export async function GET(request: Request) {
  const currentUrl = new URL(request.url);
  const oauthError = currentUrl.searchParams.get("error");
  if (oauthError) {
    const status =
      oauthError.includes("cancel") || oauthError.includes("denied")
        ? "cancelled"
        : "failed";
    const backToSignIn = new URL("/sign-in/staff", currentUrl.origin);
    backToSignIn.searchParams.set("oauth", "linkedin");
    backToSignIn.searchParams.set("status", status);
    return NextResponse.redirect(backToSignIn);
  }

  const code = currentUrl.searchParams.get("code");
  if (!code) {
    const backToSignIn = new URL("/sign-in/staff", currentUrl.origin);
    backToSignIn.searchParams.set("oauth", "linkedin");
    backToSignIn.searchParams.set("status", "failed");
    return NextResponse.redirect(backToSignIn);
  }

  const redirectUri = new URL("/api/linkedin", currentUrl.origin).href;

  const config = new client.Configuration(
    linkedInServerMetadata,
    env.LINKEDIN_CLIENT_ID,
    {
      client_secret: env.LINKEDIN_CLIENT_SECRET,
      redirect_uris: [redirectUri],
    },
  );

  try {
    const jar = await cookies();
    const savedState = jar.get(LINKEDIN_OAUTH_STATE_COOKIE)?.value;
    const checks: client.AuthorizationCodeGrantChecks = {
      expectedState: savedState ?? client.skipStateCheck,
    };

    const tokens = await client.authorizationCodeGrant(
      config,
      request,
      checks,
    );

    const claims = tokens.claims();
    if (!claims?.sub) {
      return NextResponse.json(
        { error: "ID token missing or invalid (no sub)." },
        { status: 400 },
      );
    }

    let profile: LinkedInIdClaims = { ...(claims as LinkedInIdClaims) };
    const hasEmail =
      typeof profile.email === "string" && profile.email.trim().length > 0;
    if (!hasEmail && typeof tokens.access_token === "string") {
      try {
        const info = await client.fetchUserInfo(
          config,
          tokens.access_token,
          String(claims.sub),
        );
        profile = { ...profile, ...(info as LinkedInIdClaims) };
      } catch {
        // Userinfo is optional enrichment when the ID token omits fields.
      }
    }

    const uid = `linkedin:${claims.sub}`;
    const auth = getAdminAuth();
    await ensureFirebaseUserFromLinkedIn(auth, uid, profile);

    const customToken = await auth.createCustomToken(uid);

    const redirect = new URL("/linkedin-redirect", currentUrl.origin);
    const res = NextResponse.redirect(redirect);
    res.cookies.set(LINKEDIN_FIREBASE_HANDOFF_COOKIE, customToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 300,
      secure: env.NODE_ENV === "production",
    });
    return res;
  } catch (error) {
    console.error("[linkedin] Error during LinkedIn authentication:", error);
    const backToSignIn = new URL("/sign-in/staff", currentUrl.origin);
    backToSignIn.searchParams.set("oauth", "linkedin");
    backToSignIn.searchParams.set("status", "failed");
    return NextResponse.redirect(backToSignIn);
  }
}
