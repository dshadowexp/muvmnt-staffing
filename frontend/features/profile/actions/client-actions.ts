"use server";

import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { clientSchema } from "@/features/profile/schemas/client";
import { createAdminClient } from "@/services/supabase/server";
import { z } from "zod";

export async function createClientAction(unsafeData: z.infer<typeof clientSchema>) {
    const { success, data } = clientSchema.safeParse(unsafeData);
    if (!success) {
        return { error: true, message: "Invalid profile data" };
    }
    
    const { user } = await getCurrentUser({ allData: true });
    if (user == null) {
        return { error: true, message: "User not authenticated" };
    }

    const { id: userId } = user;

    const supabase = await createAdminClient();
    const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .insert({ name: data.name, type: data.type, user_id: userId })
        .select()
        .single();

    if (clientError || clientData == null) {
        return { error: true, message: clientError?.message ?? "Failed to create client" };
    }

    return { error: false, message: "Client created successfully", data: clientData };
}