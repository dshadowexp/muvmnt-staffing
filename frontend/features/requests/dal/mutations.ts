"use server";

import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { createAdminClient } from "@/services/supabase/server";
import type { StaffRequestFormValues, StaffRequestCreateValues } from "../schema";
import { getStaffRequest } from "./queries";
import { redirect } from "next/navigation";
import { calendarDayStrings } from "../lib/calendar-day-strings";
import { mapStaffRequestToFormValues } from "../schema";

const MIN_HOURLY_RATE = 15;

function dailyTimeWindowsFromForm(data: {
  startDate: Date;
  endDate?: Date | null;
  startTime: string;
  endTime: string;
}) {
  return calendarDayStrings(data.startDate, data.endDate).map((date) => ({
    date,
    slots: [{ startTime: data.startTime, endTime: data.endTime }],
  }));
}

type InsertStaffRequestResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

async function insertStaffRequestForClient(
  data: StaffRequestCreateValues,
  hourlyRate: number | null,
): Promise<InsertStaffRequestResult> {
  const { user } = await getCurrentUser({ allData: true });
  if (user == null) return { ok: false, message: "User not authenticated" };
  if (user.role === "worker") return { ok: false, message: "User is not authorized" };

  const { id: userId } = user;

  if (
    hourlyRate != null &&
    (!Number.isFinite(hourlyRate) || hourlyRate < MIN_HOURLY_RATE)
  ) {
    return { ok: false, message: "Invalid hourly rate" };
  }

  const supabase = await createAdminClient();
  const { data: cellData, error: cellError } = await supabase
    .from("locations")
    .select("cell_id")
    .eq("user_id", userId)
    .single();

  if (cellError || cellData == null || cellData.cell_id == null) {
    return { ok: false, message: cellError?.message ?? "Failed to get cell" };
  }

  const { data: jobInfoData, error: jobInfoError } = await supabase
    .from("staff_requests")
    .insert({
      client_id: userId,
      cell_id: cellData.cell_id,
      positions: data.positions,
      requirements: data.requirements,
      tasks: data.tasks,
      notes: data.notes,
      start_date: data.startDate.toISOString(),
      end_date: data.endDate?.toISOString() ?? null,
      daily_time_windows: dailyTimeWindowsFromForm(data),
      pricing_rate: hourlyRate,
    })
    .select()
    .single();

  if (jobInfoError || jobInfoData == null) {
    return { ok: false, message: jobInfoError?.message ?? "Failed to create job info" };
  }

  return { ok: true, id: jobInfoData.id };
}

export async function createJobInfo(data: StaffRequestCreateValues) {
  const result = await insertStaffRequestForClient(data, null);
  if (!result.ok) {
    return { error: true, message: result.message };
  }

  redirect(`/app/job-infos/${result.id}/pricing`);
}

export async function updateJobInfo(id: string, data: Partial<StaffRequestFormValues>) {
    const { user} = await getCurrentUser({ allData: true });
    if (user == null)  return { error: true, message: "User not authenticated" };
    if (user.role === "worker") return { error: true, message: "User is not authorized" };

    const { id: userId } = user;

    const { data: existingJobInfo, error: existingJobInfoError, message: existingJobInfoMessage } = await getStaffRequest(id);
    if (existingJobInfoError || existingJobInfo == null) {
        return { error: true, message: existingJobInfoMessage ?? "Failed to get job info" };
    }

    if (existingJobInfo.client_id !== userId) {
        return { error: true, message: "User is not authorized to update this job info" };
    }

    const supabase = await createAdminClient();
    const update: Record<string, unknown> = {};
    if (data.startDate !== undefined) update.start_date = data.startDate.toISOString();
    if (data.endDate !== undefined) update.end_date = data.endDate?.toISOString() ?? null;
    if (data.requirements !== undefined) update.requirements = data.requirements;
    if (data.tasks !== undefined) update.tasks = data.tasks;
    if (data.positions !== undefined) update.positions = data.positions;
    if (data.notes !== undefined) update.notes = data.notes;

    if (
      data.startDate !== undefined ||
      data.endDate !== undefined ||
      data.startTime !== undefined ||
      data.endTime !== undefined
    ) {
      const merged = { ...mapStaffRequestToFormValues(existingJobInfo), ...data };
      update.daily_time_windows = dailyTimeWindowsFromForm(merged);
    }

    const { data: jobInfoData, error: jobInfoError } = await supabase
        .from("staff_requests")
        .update(update)
        .eq("id", id)
        .eq("client_id", userId)
        .select()
        .single();
        
    if (jobInfoError || jobInfoData == null) {
        return { error: true, message: jobInfoError?.message ?? "Failed to update job info" };
    }

    redirect(`/app/job-infos/${jobInfoData.id}`);
}

export async function acceptStaffRequestHourlyRate(jobId: string, hourlyRate: number) {
    const { user } = await getCurrentUser({ allData: true });
    if (user == null) return { error: true, message: "User not authenticated" };
    if (user.role === "worker") return { error: true, message: "User is not authorized" };

    const { id: userId } = user;

    if (!Number.isFinite(hourlyRate) || hourlyRate < MIN_HOURLY_RATE) {
        return { error: true, message: "Invalid hourly rate" };
    }

    const { data: existingJobInfo, error: existingJobInfoError, message: existingJobInfoMessage } =
        await getStaffRequest(jobId);
    if (existingJobInfoError || existingJobInfo == null) {
        return { error: true, message: existingJobInfoMessage ?? "Failed to get job info" };
    }

    if (existingJobInfo.client_id !== userId) {
        return { error: true, message: "User is not authorized to update this job info" };
    }

    const supabase = await createAdminClient();
    const { data: jobInfoData, error: jobInfoError } = await supabase
        .from("staff_requests")
        .update({ pricing_rate: hourlyRate })
        .eq("id", jobId)
        .eq("client_id", userId)
        .select()
        .single();

    if (jobInfoError || jobInfoData == null) {
        return { error: true, message: jobInfoError?.message ?? "Failed to save hourly rate" };
    }

    redirect(`/app/job-infos/${jobId}`);
}

export async function deleteJobInfo(id: string) {
    const { user} = await getCurrentUser({ allData: true });
    if (user == null)  return { error: true, message: "User not authenticated" };
    if (user.role === "worker") return { error: true, message: "User is not authorized" };

    const { id: userId } = user;

    const supabase = await createAdminClient();
    const { data: jobInfoData, error: jobInfoError } = await supabase
        .from("staff_requests")
        .delete()
        .eq("id", id)
        .eq("client_id", userId)
        .select()
        .single();
        
    if (jobInfoError || jobInfoData == null) {
        return { error: true, message: jobInfoError?.message ?? "Failed to delete job info" };
    }

    return { error: false, message: "Job info deleted successfully", data: jobInfoData };
}
