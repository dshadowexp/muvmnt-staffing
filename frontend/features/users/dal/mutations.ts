import { createAdminClient } from "@/services/supabase/server";
import { revalidateUserCache } from "../db-cache";

export async function updateUserIsActive(id: string, isActive: boolean) {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
        .from("users")
        .update({ is_active: isActive })
        .eq("id", id)
        .single();

    if (error) throw new Error(error.message);

    // Optionally revalidate user cache
    // revalidateUserCache(id);

    return data;
}