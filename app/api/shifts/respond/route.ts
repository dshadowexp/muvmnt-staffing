import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/services/supabase/server";
import {
    verifyShiftResponseToken,
    type ShiftResponseAction,
} from "@/features/shifts/lib/shift-response-token";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

const redirect = (path: string) => NextResponse.redirect(`${APP_URL}${path}`);

// ─── Per-action handlers ──────────────────────────────────────────────────────

type ActionContext = {
    workerId:  string;
    requestId: string;
    shiftId?:  string; // optional: for targeting a specific shift row directly
};

type ActionResult =
    | { ok: true }
    | { ok: false; reason: "already_actioned" | "not_found" | "invalid_state" | "error" };

async function handleAccept(ctx: ActionContext): Promise<ActionResult> {
    const supabase = await createAdminClient();
    const now = new Date().toISOString();

    const { error, count } = await supabase
        .from("shifts")
        .update({ status: "confirmed", confirm_time: now })
        .eq("request_id", ctx.requestId)
        .eq("worker_id",  ctx.workerId)
        .eq("status",     "scheduled")
        .overrideTypes<{ id: string }[]>();

    if (error)        return { ok: false, reason: "error" };
    if (!count)       return { ok: false, reason: "invalid_state" };
    return { ok: true };
}

async function handleDecline(ctx: ActionContext): Promise<ActionResult> {
    const supabase = await createAdminClient();
    const now = new Date().toISOString();

    const { error, count } = await supabase
        .from("shifts")
        .update({ status: "confirmed", confirm_time: now })
        .eq("request_id", ctx.requestId)
        .eq("worker_id",  ctx.workerId)
        .eq("status",     "scheduled")
        .select("id")
        .overrideTypes<{ id: string }[]>();

    if (error)  return { ok: false, reason: "error" };
    if (!count) return { ok: false, reason: "invalid_state" };
    return { ok: true };
}

async function handleTransfer(ctx: ActionContext): Promise<ActionResult> {
    // Transfer just flags the shift — your existing transfer flow
    // (findReplacementUserIdForShiftWindow etc.) picks it up from there
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

    // 1. Verify JWT
    const payload = await verifyShiftResponseToken(token);
    if (!payload) return redirect("/shifts/respond/expired");

    const supabase = await createAdminClient();

    // 2. Claim token atomically
    const { data: row, error } = await supabase
        .from("shift_response_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("token",  token)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .select("id")
        .maybeSingle();

    if (error || !row) return redirect(`/shifts/respond/already-used?action=${payload.action}`);

    // 3. Dispatch to action handler
    const handler = ACTION_HANDLERS[payload.action];
    const result  = await handler({
        workerId:  payload.workerId,
        requestId: payload.requestId,
    });

    // 4. Redirect to outcome
    return outcomeRedirect(payload.action, result);
}