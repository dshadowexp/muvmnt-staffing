import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/get-session";
import {
    enqueueNotificationSchema,
} from "@/features/notifications/service/schemas";
import { enqueueNotification } from "@/features/notifications/service/enqueue";

/**
 * POST /api/notifications/send
 *
 * Enqueues a notification across one or more channels for a user. The work
 * (user lookup, provider fan-out, retries) is delegated to Trigger.dev via
 * {@link enqueueNotification}, so this handler stays sub-100ms under
 * normal conditions and always returns 202.
 *
 * Authorization: only the owning user or an admin may enqueue — mirrors
 * the prior Fastify route.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "auto";

export async function POST(request: NextRequest): Promise<NextResponse> {
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

    const parsed = enqueueNotificationSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid request", issues: parsed.error.flatten() },
            { status: 400 },
        );
    }

    if (parsed.data.userId !== session.userId && session.role !== "admin") {
        return NextResponse.json(
            { error: "Forbidden: you can only enqueue notifications for your own user id" },
            { status: 403 },
        );
    }

    try {
        const result = await enqueueNotification(parsed.data);
        return NextResponse.json({ success: true, ...result }, { status: 202 });
    } catch (err) {
        console.error("[notifications.send] enqueue failed", {
            userId: parsed.data.userId,
            template: parsed.data.template,
            message: err instanceof Error ? err.message : String(err),
        });
        return NextResponse.json(
            { error: "Failed to enqueue notification" },
            { status: 500 },
        );
    }
}
