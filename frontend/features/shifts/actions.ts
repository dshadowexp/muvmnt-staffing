"use server";

import { env } from "@/data/env/client";
import { getSession } from "@/lib/get-session";

async function workerShiftApi(
  shiftId: string,
  pathSuffix: string,
  method: "POST" | "DELETE",
): Promise<{ error: string | null }> {
  const session = await getSession();
  if (!session?.token) {
    return { error: "You must be signed in." };
  }
  if (session.role !== "worker") {
    return { error: "Only workers can update shifts from this page." };
  }

  const url = `${env.NEXT_PUBLIC_API_URL}/v1/shifts/${encodeURIComponent(shiftId)}${pathSuffix}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
  });

  const body = (await res.json().catch(() => null)) as { message?: string } | null;
  if (!res.ok) {
    return {
      error: body?.message ?? `Request failed (${res.status})`,
    };
  }

  return { error: null };
}

export async function confirmWorkerShiftAction(
  shiftId: string,
): Promise<{ error: string | null }> {
  return workerShiftApi(shiftId, "/confirm", "POST");
}

export async function declineWorkerShiftAction(
  shiftId: string,
): Promise<{ error: string | null }> {
  return workerShiftApi(shiftId, "/decline", "POST");
}

export async function cancelWorkerShiftAction(
  shiftId: string,
): Promise<{ error: string | null }> {
  return workerShiftApi(shiftId, "", "DELETE");
}

export async function checkInWorkerShiftAction(
  shiftId: string,
): Promise<{ error: string | null }> {
  return workerShiftApi(shiftId, "/check-in", "POST");
}

export async function checkOutWorkerShiftAction(
  shiftId: string,
): Promise<{ error: string | null }> {
  return workerShiftApi(shiftId, "/check-out", "POST");
}

export async function requestWorkerShiftTransferAction(
  shiftId: string,
): Promise<{ error: string | null }> {
  return workerShiftApi(shiftId, "/transfer", "POST");
}

async function clientShiftApi(
  shiftId: string,
  pathSuffix: string,
  method: "POST",
): Promise<{ error: string | null }> {
  const session = await getSession();
  if (!session?.token) {
    return { error: "You must be signed in." };
  }
  if (session.role !== "client") {
    return { error: "Only clients can update shifts from this page." };
  }

  const url = `${env.NEXT_PUBLIC_API_URL}/v1/shifts/${encodeURIComponent(shiftId)}${pathSuffix}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
  });

  const body = (await res.json().catch(() => null)) as { message?: string } | null;
  if (!res.ok) {
    return {
      error: body?.message ?? `Request failed (${res.status})`,
    };
  }

  return { error: null };
}

export async function completeClientShiftAction(
  shiftId: string,
): Promise<{ error: string | null }> {
  return clientShiftApi(shiftId, "/complete", "POST");
}

async function clientShiftApiWithBody<TBody, TReply>(
  shiftId: string,
  pathSuffix: string,
  body: TBody,
): Promise<{ error: string | null; data: TReply | null }> {
  const session = await getSession();
  if (!session?.token) {
    return { error: "You must be signed in.", data: null };
  }
  if (session.role !== "client") {
    return { error: "Only clients can review shifts.", data: null };
  }

  const url = `${env.NEXT_PUBLIC_API_URL}/v1/shifts/${encodeURIComponent(shiftId)}${pathSuffix}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await res.json().catch(() => null)) as
    | (TReply & { message?: string })
    | { message?: string }
    | null;
  if (!res.ok) {
    const message = payload?.message ?? `Request failed (${res.status})`;
    return { error: message, data: null };
  }
  return { error: null, data: (payload as TReply) ?? null };
}

/** Client rates a completed shift (1–5 stars, optional comment). */
export async function rateClientShiftAction(
  shiftId: string,
  input: { rating: number; comment?: string },
): Promise<{ error: string | null }> {
  const res = await clientShiftApiWithBody<typeof input, { ok: true }>(
    shiftId,
    "/rating",
    input,
  );
  return { error: res.error };
}

/**
 * Client tips a completed shift. The server charges the client's saved card and
 * routes the funds directly to the worker's Stripe Connect account.
 */
export async function tipClientShiftAction(
  shiftId: string,
  input: { amountCents: number },
): Promise<{ error: string | null; amountCents?: number; currency?: string }> {
  const res = await clientShiftApiWithBody<
    typeof input,
    { ok: true; paymentIntentId: string; amountCents: number; currency: string }
  >(shiftId, "/tip", input);
  if (res.error || !res.data) return { error: res.error };
  return {
    error: null,
    amountCents: res.data.amountCents,
    currency: res.data.currency,
  };
}
