"use server";

import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { createAdminClient } from "@/services/supabase/server";
import { JobFormValues } from "../schema";
import { getJobInfo } from "./queries";
import { redirect } from "next/navigation";

export async function createJobInfo(data: JobFormValues) {
    const { user} = await getCurrentUser({ allData: true });
    if (user == null)  return { error: true, message: "User not authenticated" };
    if (user.role === "worker") return { error: true, message: "User is not authorized" };

    const { id: userId } = user;

    const supabase = await createAdminClient();
    const { data: cellData, error: cellError } = await supabase
        .from("locations")
        .select("cell_id")
        .eq("user_id", userId)
        .single();

    if (cellError || cellData == null || cellData.cell_id == null) {
        return { error: true, message: cellError?.message ?? "Failed to get cell" };
    }

    const { data: jobInfoData, error: jobInfoError } = await supabase
        .from("job_infos")
        .insert({ 
            client_id: userId, 
            cell_id: cellData.cell_id,
            title: data.title,
            profession: data.profession,  
            hourly_rate: data.hourlyRate,
            positions: data.positions,
            requirements: data.requirements,
            tasks: data.tasks,
            notes: data.notes,
            start_date: data.startDate.toISOString(), 
            end_date: data.endDate?.toISOString(), 
            start_time: data.startTime, 
            end_time: data.endTime, 
        })
        .select()
        .single();

    if (jobInfoError || jobInfoData == null) {
        return { error: true, message: jobInfoError?.message ?? "Failed to create job info" };
    }

    redirect(`/app/job-infos/${jobInfoData.id}`);
}

export async function updateJobInfo(id: string, data: Partial<JobFormValues>) {
    const { user} = await getCurrentUser({ allData: true });
    if (user == null)  return { error: true, message: "User not authenticated" };
    if (user.role === "worker") return { error: true, message: "User is not authorized" };

    const { id: userId } = user;

    const { data: existingJobInfo, error: existingJobInfoError, message: existingJobInfoMessage } = await getJobInfo(id);
    if (existingJobInfoError || existingJobInfo == null) {
        return { error: true, message: existingJobInfoMessage ?? "Failed to get job info" };
    }

    if (existingJobInfo.client_id !== userId) {
        return { error: true, message: "User is not authorized to update this job info" };
    }

    const supabase = await createAdminClient();
    const update: Record<string, unknown> = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.profession !== undefined) update.profession = data.profession;
    if (data.startDate !== undefined) update.start_date = data.startDate.toISOString();
    if (data.endDate !== undefined) update.end_date = data.endDate?.toISOString() ?? null;
    if (data.startTime !== undefined) update.start_time = data.startTime;
    if (data.endTime !== undefined) update.end_time = data.endTime;
    if (data.requirements !== undefined) update.requirements = data.requirements;
    if (data.tasks !== undefined) update.tasks = data.tasks;
    if (data.hourlyRate !== undefined) update.hourly_rate = data.hourlyRate;
    if (data.positions !== undefined) update.positions = data.positions;
    if (data.notes !== undefined) update.notes = data.notes;

    const { data: jobInfoData, error: jobInfoError } = await supabase
        .from("job_infos")
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

export async function deleteJobInfo(id: string) {
    const { user} = await getCurrentUser({ allData: true });
    if (user == null)  return { error: true, message: "User not authenticated" };
    if (user.role === "worker") return { error: true, message: "User is not authorized" };

    const { id: userId } = user;

    const supabase = await createAdminClient();
    const { data: jobInfoData, error: jobInfoError } = await supabase
        .from("job_infos")
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