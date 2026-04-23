import "server-only";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@/services/supabase/server";

export async function getCurrentUser() {
    const session = await getSession();
    if (!session) return null;
    return getUser(session.userId);
}

export async function getUser(id: string) {
    // "use cache"
    // cacheTag(getGlobalTag("users"))

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

