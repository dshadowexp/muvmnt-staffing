"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import {
  jobFormSchema,
  staffRequestCreateSchema,
  staffRequestPricingPreviewPayloadSchema,
  type StaffRequestCreateValues,
} from "./schema";
import {
  acceptStaffRequestHourlyRate,
  createJobInfo,
  updateJobInfo,
} from "./dal/mutations";
import { simulateStaffRequestPricingQuote } from "./pricing/staff-request-pricing";
import type { CreateAndMatchApiData } from "./types/staff-match";
import { env } from "@/data/env/client";

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
    profession: p.profession,
    start_date: p.startDate.toISOString(),
    end_date: p.endDate ? p.endDate.toISOString() : null,
    start_time: p.startTime,
    end_time: p.endTime,
    positions: p.positions,
  });
  return { error: false as const, data };
}

export async function createStaffRequestAndMatchAction(unsafe: unknown) {
  const parsed = staffRequestCreateSchema.safeParse(unsafe);
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

  const res = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/v1/staff-requests/create-and-match`, 
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.token}`,
      },
      body: JSON.stringify(parsed.data),
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
    !("tiers" in body)
  ) {
    return { error: true as const, message: "Invalid response from API" };
  }

  const data = body as CreateAndMatchApiData;
  return {
    error: false as const,
    data: {
      jobId: data.jobId,
      tiers: data.tiers,
      ringCellCount: data.ringCellCount,
      candidateCount: data.candidateCount,
      currency: data.currency,
    },
  };
}

const finalizeMatchSchema = z.object({
  jobId: z.string().min(1),
  hourlyRate: z.coerce.number().min(15, "Minimum hourly rate is $15"),
  notes: z.string().optional(),
});

export async function finalizeStaffRequestMatchAction(unsafe: unknown) {
  const parsed = finalizeMatchSchema.safeParse(unsafe);
  if (!parsed.success) {
    return {
      error: true as const,
      message: parsed.error.issues[0]?.message ?? "Invalid submission",
    };
  }
  const { jobId, hourlyRate, notes } = parsed.data;

  const session = await getSession();
  if (!session?.token) {
    return { error: true as const, message: "Not signed in" };
  }

  const res = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/v1/staff-requests/finalize`, 
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.token}`,
      },
      body: JSON.stringify(parsed.data),
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
