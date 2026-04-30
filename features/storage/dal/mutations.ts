"use server";

import { getSession } from "@/lib/get-session";
import { s3Api } from "@/services/s3/api";

export async function deleteFile(key: string) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const exists = await s3Api.getMetadata(key);
    if (!exists) {
        // Idempotent: file already gone — treat as success
        return;
    }

    await s3Api.delete(key);
}