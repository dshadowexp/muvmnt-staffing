"use server"

import { getAuthenticatedAppForUser } from "../serverApp";
import { createAdminClient } from "@/services/supabase/server";

export async function getCurrentUser({ allData = false } = {}) {
    const { currentUser: firebaseUser } = await getAuthenticatedAppForUser();

    return {
        authUser: firebaseUser,
        user: allData && firebaseUser != null ? await getUser(firebaseUser.uid) : undefined,
    }
}

async function getUser(authId: string) {
    // "use cache"

    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", authId)
        .single();
    
    if (error) {
        if (error.code === "PGRST116") return null
        throw new Error(`Failed to fetch user: ${error.message}`)
    }

    return data;
}
