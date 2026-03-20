"use server";

import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { createAdminClient } from "@/services/supabase/server";

export async function getJobInfo(id: string) {
    const { user} = await getCurrentUser({ allData: true });
    if (user == null)  return { error: true, message: "User not authenticated" };
    
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("job_infos")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        return { error: true, message: error.message };
    }

    return { error: false, data: data };
}

export async function getJobInfos() {
    const { user } = await getCurrentUser({ allData: true });
    if (user == null)  return { error: true, message: "User not authenticated" };
    
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("job_infos")
        .select("*")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        return { error: true, message: error.message };
    }

    return { error: false, data: data };
}