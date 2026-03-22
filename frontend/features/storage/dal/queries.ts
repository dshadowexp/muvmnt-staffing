"use server";

import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { s3Api, StorageFolder } from "@/services/s3/api";

export async function getPresignedUrl(params: {
    filename: string;
    contentType: string;
    context: StorageFolder;
}) {
    const { user, authUser } = await getCurrentUser({allData: true});
    if (!user || !authUser) 
        throw new Error('Unauthorized');

    return await s3Api.presignedUploadUrl({
        filename: params.filename,
        contentType: params.contentType,
        context: params.context,
        ownerId: user.id,
    });
}

export async function getPresignedDownloadUrl(key: string) {
    const { user, authUser } = await getCurrentUser({ allData: true });
    if (!user || !authUser) throw new Error("Unauthorized");

    return await s3Api.presignedDownloadUrl({ key, expiresIn: 3600 });
}