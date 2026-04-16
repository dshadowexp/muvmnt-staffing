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
