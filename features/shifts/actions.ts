"use server";

import { getSession } from "@/lib/get-session";
import {
    cancelWorkerShift,
    checkInWorkerShift,
    checkOutWorkerShift,
    confirmWorkerShift,
    declineWorkerShift,
    requestWorkerShiftTransfer,
} from "./server/worker-actions";
import { completeClientShift } from "./server/client-actions";
import { rateClientShift, tipClientShift } from "./server/review";

type ShiftActionResult = { error: string | null };

async function requireWorker(): Promise<
    | { ok: true; userId: string }
    | { ok: false; error: string }
> {
    const session = await getSession();
    if (!session?.token) return { ok: false, error: "You must be signed in." };
    if (session.role !== "worker") {
        return {
            ok: false,
            error: "Only workers can update shifts from this page.",
        };
    }
    return { ok: true, userId: session.userId };
}

async function requireClient(): Promise<
    | { ok: true; userId: string }
    | { ok: false; error: string }
> {
    const session = await getSession();
    if (!session?.token) return { ok: false, error: "You must be signed in." };
    if (session.role !== "client") {
        return {
            ok: false,
            error: "Only clients can update shifts from this page.",
        };
    }
    return { ok: true, userId: session.userId };
}

function toResult(
    result: { ok: true } | { ok: false; message: string },
): ShiftActionResult {
    return result.ok ? { error: null } : { error: result.message };
}

// ─── Worker actions ──────────────────────────────────────────────────────────

export async function confirmWorkerShiftAction(
    shiftId: string,
): Promise<ShiftActionResult> {
    const auth = await requireWorker();
    if (!auth.ok) return { error: auth.error };
    return toResult(await confirmWorkerShift(auth.userId, shiftId));
}

export async function declineWorkerShiftAction(
    shiftId: string,
): Promise<ShiftActionResult> {
    const auth = await requireWorker();
    if (!auth.ok) return { error: auth.error };
    return toResult(await declineWorkerShift(auth.userId, shiftId));
}

export async function cancelWorkerShiftAction(
    shiftId: string,
): Promise<ShiftActionResult> {
    const auth = await requireWorker();
    if (!auth.ok) return { error: auth.error };
    return toResult(await cancelWorkerShift(auth.userId, shiftId));
}

export async function checkInWorkerShiftAction(
    shiftId: string,
): Promise<ShiftActionResult> {
    const auth = await requireWorker();
    if (!auth.ok) return { error: auth.error };
    return toResult(await checkInWorkerShift(auth.userId, shiftId));
}

export async function checkOutWorkerShiftAction(
    shiftId: string,
): Promise<ShiftActionResult> {
    const auth = await requireWorker();
    if (!auth.ok) return { error: auth.error };
    return toResult(await checkOutWorkerShift(auth.userId, shiftId));
}

export async function requestWorkerShiftTransferAction(
    shiftId: string,
): Promise<ShiftActionResult> {
    const auth = await requireWorker();
    if (!auth.ok) return { error: auth.error };
    return toResult(await requestWorkerShiftTransfer(auth.userId, shiftId));
}

// ─── Client actions ──────────────────────────────────────────────────────────

export async function completeClientShiftAction(
    shiftId: string,
): Promise<ShiftActionResult> {
    const auth = await requireClient();
    if (!auth.ok) return { error: auth.error };
    return toResult(await completeClientShift(auth.userId, shiftId));
}

/** Client rates a completed shift (1–5 stars, optional comment). */
export async function rateClientShiftAction(
    shiftId: string,
    input: { rating: number; comment?: string },
): Promise<ShiftActionResult> {
    const auth = await requireClient();
    if (!auth.ok) return { error: auth.error };
    const result = await rateClientShift(auth.userId, shiftId, input);
    return result.ok ? { error: null } : { error: result.message };
}

/**
 * Client tips a completed shift. Charges the saved card and routes funds
 * straight to the worker's Stripe Connect account.
 */
export async function tipClientShiftAction(
    shiftId: string,
    input: { amountCents: number },
): Promise<{
    error: string | null;
    amountCents?: number;
    currency?: string;
}> {
    const auth = await requireClient();
    if (!auth.ok) return { error: auth.error };
    const result = await tipClientShift(auth.userId, shiftId, input);
    if (!result.ok) return { error: result.message };
    return {
        error: null,
        amountCents: result.amountCents,
        currency: result.currency,
    };
}
