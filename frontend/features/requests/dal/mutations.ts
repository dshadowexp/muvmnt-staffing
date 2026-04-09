"use server";

import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { createAdminClient } from "@/services/supabase/server";
import type { StaffRequestFormValues, StaffRequestCreateValues } from "../schema";
import { getStaffRequest } from "./queries";
import { redirect } from "next/navigation";

const MIN_HOURLY_RATE = 15;

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
      profession: data.profession,
      positions: data.positions,
      requirements: data.requirements,
      tasks: data.tasks,
      notes: data.notes,
      start_date: data.startDate.toISOString(),
      end_date: data.endDate?.toISOString() ?? null,
      start_time: data.startTime,
      end_time: data.endTime,
      hourly_rate: hourlyRate,
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
    if (data.profession !== undefined) update.profession = data.profession;
    if (data.startDate !== undefined) update.start_date = data.startDate.toISOString();
    if (data.endDate !== undefined) update.end_date = data.endDate?.toISOString() ?? null;
    if (data.startTime !== undefined) update.start_time = data.startTime;
    if (data.endTime !== undefined) update.end_time = data.endTime;
    if (data.requirements !== undefined) update.requirements = data.requirements;
    if (data.tasks !== undefined) update.tasks = data.tasks;
    if (data.positions !== undefined) update.positions = data.positions;
    if (data.notes !== undefined) update.notes = data.notes;

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
        .update({ hourly_rate: hourlyRate })
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
