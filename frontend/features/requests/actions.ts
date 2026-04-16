"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import {
  jobFormSchema,
  staffRequestCreateSchema,
  staffRequestPricingPreviewPayloadSchema,
  staffRequestScheduleSchema,
  type StaffRequestCreateValues,
} from "./schema";
import {
  acceptStaffRequestHourlyRate,
  createJobInfo,
  updateJobInfo,
} from "./dal/mutations";
import { STAFF_REQUEST_PROFESSION_PLACEHOLDER } from "./constants";
import { simulateStaffRequestPricingQuote } from "./pricing/staff-request-pricing";
import type {
  CreateAndMatchApiData,
  StaffRequestPricingTiersData,
} from "./types/staff-match";
import { env } from "@/data/env/client";
import { getPresignedDownloadUrl } from "@/features/storage/dal/queries";

export async function createJobInfoAction(unsafeData: unknown) {
  const { success, data } = staffRequestCreateSchema.safeParse(unsafeData);
  if (!success) {
    return { error: true, message: "Invalid job data" };
  }

  const { error, message } = await createJobInfo(data as StaffRequestCreateValues);
  if (error) {
    return { error: true, message: message };
  }

  return { error: false, message: message, data: data };
}

export async function updateJobInfoAction(id: string, unsafeData: unknown) {
  const { success, data } = jobFormSchema.safeParse(unsafeData);
  if (!success) {
    return { error: true, message: "Invalid job data" };
  }

  const { error, message } = await updateJobInfo(id, data);
  if (error) {
    return { error: true, message: message };
  }

  return { error: false, message: message, data: data };
}

const acceptRateSchema = z.coerce.number().min(15, "Minimum hourly rate is $15");

export async function acceptStaffRequestHourlyRateAction(
  jobId: string,
  unsafeHourlyRate: unknown,
) {
  const parsed = acceptRateSchema.safeParse(unsafeHourlyRate);
  if (!parsed.success) {
    return { error: true, message: parsed.error.issues[0]?.message ?? "Invalid rate" };
  }

  return acceptStaffRequestHourlyRate(jobId, parsed.data);
}

export async function previewStaffRequestPricingAction(unsafe: unknown) {
  const parsed = staffRequestPricingPreviewPayloadSchema.safeParse(unsafe);
  if (!parsed.success) {
    return {
      error: true as const,
      message: parsed.error.issues[0]?.message ?? "Invalid schedule",
    };
  }
  const p = parsed.data;
  const data = simulateStaffRequestPricingQuote({
    profession: STAFF_REQUEST_PROFESSION_PLACEHOLDER,
    start_date: p.startDate.toISOString(),
    end_date: p.endDate ? p.endDate.toISOString() : null,
    positions: p.positions,
    dailyWindows: p.dailyWindows,
  });
  return { error: false as const, data };
}

/** Resolve worker headshot for match UI (S3 key → presigned URL, or pass through http(s)). */
export async function resolveMatchWorkerPhotoUrlAction(photoKeyOrUrl: string | null) {
  if (photoKeyOrUrl == null || photoKeyOrUrl === "") {
    return { url: null as string | null };
  }
  if (/^https?:\/\//i.test(photoKeyOrUrl)) {
    return { url: photoKeyOrUrl };
  }
  try {
    const { url } = await getPresignedDownloadUrl(photoKeyOrUrl);
    return { url };
  } catch {
    return { url: null as string | null };
  }
}

export async function createStaffRequestDraftAction(unsafe: unknown) {
  const parsed = staffRequestScheduleSchema.safeParse(unsafe);
  if (!parsed.success) {
    return {
      error: true as const,
      message: parsed.error.issues[0]?.message ?? "Invalid request details",
    };
  }

  const session = await getSession();
  if (!session?.token) {
    return { error: true as const, message: "Not signed in" };
  }
  if (session.role !== "client") {
    return { error: true as const, message: "Only clients can create staff requests" };
  }

  const p = parsed.data;
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/v1/staff-requests/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify({
      startDate: p.startDate.toISOString(),
      endDate: p.endDate ? p.endDate.toISOString() : null,
      dailyWindows: p.dailyWindows,
      positions: p.positions,
    }),
  });

  const body = (await res.json().catch(() => null)) as { jobId?: string; message?: string } | null;

  if (!res.ok) {
    const msg =
      body && typeof body === "object" && "message" in body && body.message
        ? String(body.message)
        : `Request failed (${res.status})`;
    return { error: true as const, message: msg };
  }

  if (!body || typeof body !== "object" || typeof body.jobId !== "string") {
    return { error: true as const, message: "Invalid response from API" };
  }

  return { error: false as const, data: { jobId: body.jobId } };
}

export async function getStaffRequestPricingTiersAction(jobId: string) {
  const session = await getSession();
  if (!session?.token) {
    return { error: true as const, message: "Not signed in" };
  }
  if (session.role !== "client") {
    return { error: true as const, message: "Only clients can load pricing tiers" };
  }

  const res = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/v1/staff-requests/${encodeURIComponent(jobId)}/pricing-tiers`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${session.token}` },
    },
  );

  const body = (await res.json().catch(() => null)) as
    | StaffRequestPricingTiersData
    | { message?: string }
    | null;

  if (!res.ok) {
    const msg =
      body && typeof body === "object" && "message" in body && body.message
        ? String(body.message)
        : `Request failed (${res.status})`;
    return { error: true as const, message: msg };
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("tiers" in body) ||
    !Array.isArray((body as StaffRequestPricingTiersData).tiers)
  ) {
    return { error: true as const, message: "Invalid response from API" };
  }

  return { error: false as const, data: body as StaffRequestPricingTiersData };
}

const matchPricingSchema = z.object({
  jobId: z.string().min(1),
  pricingTier: z.string().min(1),
  pricingRate: z.coerce.number().min(15, "Minimum hourly rate is $15"),
});

export async function runStaffRequestMatchAction(unsafe: unknown) {
  const parsed = matchPricingSchema.safeParse(unsafe);
  if (!parsed.success) {
    return {
      error: true as const,
      message: parsed.error.issues[0]?.message ?? "Invalid match request",
    };
  }

  const session = await getSession();
  if (!session?.token) {
    return { error: true as const, message: "Not signed in" };
  }
  if (session.role !== "client") {
    return { error: true as const, message: "Only clients can run matching" };
  }

  const { jobId, pricingTier, pricingRate } = parsed.data;
  const res = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/v1/staff-requests/${encodeURIComponent(jobId)}/match`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ pricingTier, pricingRate }),
    },
  );

  const body = (await res.json().catch(() => null)) as
    | CreateAndMatchApiData
    | { message?: string }
    | null;

  if (!res.ok) {
    const msg =
      body && typeof body === "object" && "message" in body && body.message
        ? String(body.message)
        : `Request failed (${res.status})`;
    return { error: true as const, message: msg };
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("jobId" in body) ||
    !("schedule" in body) ||
    !Array.isArray((body as CreateAndMatchApiData).schedule)
  ) {
    return { error: true as const, message: "Invalid response from API" };
  }

  const data = body as CreateAndMatchApiData;
  return {
    error: false as const,
    data: {
      jobId: data.jobId,
      schedule: data.schedule,
      totalWorkers: data.totalWorkers,
      fullyCovered: data.fullyCovered,
      ringCellCount: data.ringCellCount,
      candidateCount: data.candidateCount,
      currency: data.currency,
      pricingTier: data.pricingTier ?? pricingTier,
      pricingRate: data.pricingRate ?? pricingRate,
    },
  };
}

const confirmStaffRequestSchema = z.object({
  jobId: z.string().min(1),
  notes: z.string().optional(),
});

export async function confirmStaffRequestAction(unsafe: unknown) {
  const parsed = confirmStaffRequestSchema.safeParse(unsafe);
  if (!parsed.success) {
    return {
      error: true as const,
      message: parsed.error.issues[0]?.message ?? "Invalid submission",
    };
  }
  const { jobId, notes } = parsed.data;

  const session = await getSession();
  if (!session?.token) {
    return { error: true as const, message: "Not signed in" };
  }

  const res = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/v1/staff-requests/${encodeURIComponent(jobId)}/confirm`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ notes: notes ?? "" }),
    },
  );

  const errBody = (await res.json().catch(() => null)) as { message?: string } | null;
  if (!res.ok) {
    return {
      error: true as const,
      message: errBody?.message ?? `Request failed (${res.status})`,
    };
  }

  redirect(`/app/job-infos/${jobId}`);
}

export async function abandonStaffRequestDraftAction(jobId: string) {
  const session = await getSession();
  if (!session?.token) {
    return { error: true as const, message: "Not signed in" };
  }

  const res = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/v1/staff-requests/${encodeURIComponent(jobId)}/draft`,
    {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${session.token}`,
      },
    },
  );

  const errBody = (await res.json().catch(() => null)) as { message?: string } | null;
  if (!res.ok) {
    return {
      error: true as const,
      message: errBody?.message ?? `Request failed (${res.status})`,
    };
  }

  return { error: false as const };
}
