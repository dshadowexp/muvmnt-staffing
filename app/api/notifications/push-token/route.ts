import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/get-session";
import { upsertPushTokenSchema } from "@/features/notifications/service/schemas";
import { upsertPushToken, deletePushToken } from "@/features/notifications/dal/mutations";

/**
 * FCM / Web-Push token registration endpoint.
 *
 * Mobile clients PUT their FCM token on login + rotation and DELETE it on
 * logout. `platform` is accepted for future multi-device support; today it
 * is validated and logged but not persisted (matching the existing DAL).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest): Promise<NextResponse> {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = upsertPushTokenSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid request", issues: parsed.error.flatten() },
            { status: 400 },
        );
    }

    const result = await upsertPushToken(parsed.data.token);
    if (result.error) {
        return NextResponse.json({ error: result.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
}

export async function DELETE(): Promise<NextResponse> {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const result = await deletePushToken();
    if (result.error) {
        return NextResponse.json({ error: result.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
}
