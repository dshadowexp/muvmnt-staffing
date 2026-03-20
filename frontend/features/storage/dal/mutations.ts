"use server";

import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { s3Api } from "@/services/s3/api";

export async function deleteFile(key: string) {
    const { user, authUser } = await getCurrentUser({allData: true});
    if (!user || !authUser) 
        throw new Error('Unauthorized');

    const exists = await s3Api.getMetadata(key);
    if (!exists) {
        throw new Error('File not found');
    }

    await s3Api.delete(key);
}