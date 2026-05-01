import "server-only";
import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/supabase/server";
import { LEGACY_STAFF_DB_ROLE, STAFF_ROLE } from "@/features/auth/types";

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

/**
 * Returns true if the given email belongs to an existing staff user (`staff` or legacy `worker` role).
 * Used to decide which auth gate to show on the screening invite page.
 */
export async function isStaffEmail(email: string): Promise<boolean> {
    const supabase = await createAdminClient();
    const { data } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .in("role", [STAFF_ROLE, LEGACY_STAFF_DB_ROLE])
        .maybeSingle();
    return data !== null;
}

/** @deprecated Use {@link isStaffEmail} */
export const isWorkerEmail = isStaffEmail;

