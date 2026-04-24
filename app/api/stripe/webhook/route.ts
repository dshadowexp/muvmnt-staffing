import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "@/data/env/server";
import { getStripeServer } from "@/services/stripe/server";
import { dispatchStripeEvent } from "@/features/payments/stripe-webhook/dispatch";

/**
 * Stripe webhook endpoint.
 *
 * Pipeline:
 *   1. Read the raw body (required for signature verification).
 *   2. Verify the Stripe signature against `STRIPE_WEBHOOK_SECRET`.
 *   3. Hand the verified event to Trigger.dev — keyed by Stripe event id so
 *      redeliveries are deduped at the task layer.
 *   4. Acknowledge with 202 as fast as possible to stay inside Stripe's 10s
 *      webhook timeout.
 *
 * Anything that might fail long-running (DB, email, Stripe API) lives inside
 * the Trigger.dev task, not here.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "auto";

export async function POST(request: NextRequest): Promise<NextResponse> {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
        return NextResponse.json(
            { error: "Missing stripe-signature header" },
            { status: 400 },
        );
    }

    let rawBody: string;
    try {
        rawBody = await request.text();
    } catch (err) {
        console.error("[stripe-webhook] failed to read request body", err);
        return NextResponse.json(
            { error: "Unable to read request body" },
            { status: 400 },
        );
    }

    const stripe = getStripeServer();
    let event;
    try {
        event = stripe.webhooks.constructEvent(
            rawBody,
            signature,
            env.STRIPE_WEBHOOK_SECRET,
        );
    } catch (err) {
        console.warn("[stripe-webhook] signature verification failed", {
            message: err instanceof Error ? err.message : String(err),
        });
        return NextResponse.json(
            { error: "Invalid signature" },
            { status: 400 },
        );
    }

    try {
        const result = await dispatchStripeEvent(event);
        return NextResponse.json(
            {
                received: true,
                eventId: event.id,
                type: event.type,
                ...result,
            },
            { status: 202 },
        );
    } catch (err) {
        // We intentionally return 500 (not 2xx) so Stripe retries. The error
        // was on our side accepting the event, not on Stripe's.
        console.error("[stripe-webhook] failed to enqueue", {
            eventId: event.id,
            type: event.type,
            message: err instanceof Error ? err.message : String(err),
        });
        return NextResponse.json(
            { error: "Failed to enqueue webhook" },
            { status: 500 },
        );
    }
}
