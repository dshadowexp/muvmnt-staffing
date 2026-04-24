import { type NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { createAdminClient } from "@/services/supabase/server";
import {
    verifyShiftResponseToken,
    type ShiftResponseAction,
} from "@/features/shifts/lib/shift-response-token";
import { enqueueNotification } from "@/features/notifications/service/enqueue";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

const redirect = (path: string) => NextResponse.redirect(`${APP_URL}${path}`);

// ─── Per-action handlers ──────────────────────────────────────────────────────

type ActionContext = {
    /** workers.id (internal UUID — used for DB shift queries) */
    workerId:  string;
    requestId: string;
};

type ShiftMeta = { id: string; start_time: string | null };

type ActionResult =
    | { ok: true;  shifts?: ShiftMeta[] }
    | { ok: false; reason: "already_actioned" | "not_found" | "invalid_state" | "error" };

async function handleAccept(ctx: ActionContext): Promise<ActionResult> {
    const supabase = await createAdminClient();
    const now = new Date().toISOString();

    const { data, error, count } = await supabase
        .from("shifts")
        .update({ status: "confirmed", confirm_time: now })
        .eq("request_id", ctx.requestId)
        .eq("worker_id",  ctx.workerId)
        .eq("status",     "scheduled")
        .select("id, start_time")
        .overrideTypes<ShiftMeta[]>();

    if (error)  return { ok: false, reason: "error" };
    if (!count) return { ok: false, reason: "invalid_state" };
    return { ok: true, shifts: data ?? [] };
}

async function handleDecline(ctx: ActionContext): Promise<ActionResult> {
    const supabase = await createAdminClient();

    // Bug fix: was "confirmed" — must be "declined"
    const { data, error, count } = await supabase
        .from("shifts")
        .update({ status: "declined" })
        .eq("request_id", ctx.requestId)
        .eq("worker_id",  ctx.workerId)
        .eq("status",     "scheduled")
        .select("id, start_time")
        .overrideTypes<ShiftMeta[]>();

    if (error)  return { ok: false, reason: "error" };
    if (!count) return { ok: false, reason: "invalid_state" };
    return { ok: true, shifts: data ?? [] };
}

async function handleTransfer(ctx: ActionContext): Promise<ActionResult> {
    const supabase = await createAdminClient();
    const now = new Date().toISOString();

    const { error, count } = await supabase
        .from("shifts")
        .update({ status: "transfer_requested", confirm_time: now })
        .eq("request_id", ctx.requestId)
        .eq("worker_id",  ctx.workerId)
        .eq("status",     "confirmed")
        .select("id")
        .overrideTypes<{ id: string }[]>();

    if (error)  return { ok: false, reason: "error" };
    if (!count) return { ok: false, reason: "invalid_state" };
    return { ok: true };
}

async function handleCheckIn(ctx: ActionContext): Promise<ActionResult> {
    const supabase = await createAdminClient();
    const now = new Date().toISOString();

    const { error, count } = await supabase
        .from("shifts")
        .update({ status: "in_progress", checkin_time: now })
        .eq("request_id", ctx.requestId)
        .eq("worker_id",  ctx.workerId)
        .eq("status",     "confirmed")
        .select("id")
        .overrideTypes<{ id: string }[]>();

    if (error)  return { ok: false, reason: "error" };
    if (!count) return { ok: false, reason: "invalid_state" };
    return { ok: true };
}

async function handleCheckOut(ctx: ActionContext): Promise<ActionResult> {
    const supabase = await createAdminClient();
    const now = new Date().toISOString();

    const { error, count } = await supabase
        .from("shifts")
        .update({ status: "pending_completion", checkout_time: now })
        .eq("request_id", ctx.requestId)
        .eq("worker_id",  ctx.workerId)
        .eq("status",     "in_progress")
        .select("id")
        .overrideTypes<{ id: string }[]>();

    if (error)  return { ok: false, reason: "error" };
    if (!count) return { ok: false, reason: "invalid_state" };
    return { ok: true };
}

async function handleComplete(ctx: ActionContext): Promise<ActionResult> {
    const supabase = await createAdminClient();
    const now = new Date().toISOString();

    const { error, count } = await supabase
        .from("shifts")
        .update({ status: "completed", complete_time: now })
        .eq("request_id", ctx.requestId)
        .eq("worker_id",  ctx.workerId)
        .eq("status",     "pending_completion")
        .select("id")
        .overrideTypes<{ id: string }[]>();

    if (error)  return { ok: false, reason: "error" };
    if (!count) return { ok: false, reason: "invalid_state" };
    return { ok: true };
}

// ─── Action dispatch map ──────────────────────────────────────────────────────

const ACTION_HANDLERS: Record<
    ShiftResponseAction,
    (ctx: ActionContext) => Promise<ActionResult>
> = {
    accept:    handleAccept,
    decline:   handleDecline,
    transfer:  handleTransfer,
    check_in:  handleCheckIn,
    check_out: handleCheckOut,
    complete:  handleComplete,
};

// ─── Outcome redirects ────────────────────────────────────────────────────────

function outcomeRedirect(action: ShiftResponseAction, result: ActionResult) {
    if (!result.ok) {
        switch (result.reason) {
            case "already_actioned": return redirect(`/shifts/respond/already-used?action=${action}`);
            case "invalid_state":   return redirect(`/shifts/respond/invalid-state?action=${action}`);
            case "not_found":       return redirect(`/shifts/respond/invalid`);
            default:                return redirect(`/shifts/respond/error`);
        }
    }

    switch (action) {
        case "accept":    return redirect("/shifts/respond/success?action=accept");
        case "decline":   return redirect("/shifts/respond/success?action=decline");
        case "transfer":  return redirect("/shifts/respond/success?action=transfer");
        case "check_in":  return redirect("/shifts/respond/success?action=check_in");
        case "check_out": return redirect("/shifts/respond/success?action=check_out");
        case "complete":  return redirect("/shifts/respond/success?action=complete");
    }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) return redirect("/shifts/respond/invalid");

    // 1. Verify JWT signature + expiry
    const payload = await verifyShiftResponseToken(token);
    if (!payload) return redirect("/shifts/respond/expired");

    const supabase = await createAdminClient();

    // 2. Claim token atomically (single-use enforcement)
    const { data: tokenRow, error: tokenErr } = await supabase
        .from("shift_response_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("token",      token)
        .is("used_at",    null)
        .gt("expires_at", new Date().toISOString())
        .select("id")
        .maybeSingle();

    if (tokenErr || !tokenRow) {
        return redirect(`/shifts/respond/already-used?action=${payload.action}`);
    }

    // 3. Resolve workers.id from the user_id stored in the token.
    //    shifts.worker_id references workers.id, not the Firebase user_id.
    const { data: workerRow } = await supabase
        .from("workers")
        .select("id")
        .eq("user_id", payload.workerId)
        .maybeSingle();

    if (!workerRow) return redirect("/shifts/respond/invalid");

    // 4. Dispatch to action handler
    const handler = ACTION_HANDLERS[payload.action];
    const result  = await handler({
        workerId:  workerRow.id,   // workers.id for shift queries
        requestId: payload.requestId,
    });

    // 5. Post-dispatch side-effects (fire-and-forget — don't block the redirect)
    if (result.ok) {
        const shiftIds = result.shifts?.map((s) => s.id) ?? [];

        if (payload.action === "decline" && shiftIds.length > 0) {
            // Immediately kick off the next-worker offer loop for each declined shift
            void Promise.allSettled(
                shiftIds.map((shiftId) =>
                    tasks.trigger("shifts.offer-worker", { shiftId }),
                ),
            );
        }

        if (payload.action === "accept" && result.shifts?.length) {
            // Schedule a push reminder 1 hour before each confirmed shift
            const now = Date.now();
            void Promise.allSettled(
                result.shifts.map((s) => {
                    if (!s.start_time) return;
                    const delayMs = new Date(s.start_time).getTime() - 60 * 60 * 1000 - now;
                    if (delayMs < 60_000) return; // shift starts in < 1 h — skip
                    return enqueueNotification({
                        userId:   payload.workerId, // user_id for notification routing
                        channels: [{
                            channel:  "push",
                            template: "shift-reminder",
                            data: {
                                shiftId: s.id,
                                link:    `${APP_URL}/dashboard/shifts/${s.id}`,
                            },
                        }],
                        delayMs,
                    });
                }),
            );
        }
    }

    // 6. Redirect to outcome page
    return outcomeRedirect(payload.action, result);
}
