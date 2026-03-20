import { createAdminClient } from "@/services/supabase/server"
import { getGlobalTag } from "@/lib/data-cache"
import { cacheTag } from "next/cache"

export async function getUser(id: string) {
    "use cache"
    cacheTag(getGlobalTag("users"))

    const supabase = await createAdminClient();   
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();

    if (error && error.code !== "PGRST116") throw new Error(error.message);
    if (data == null) return null;

    return data;
}