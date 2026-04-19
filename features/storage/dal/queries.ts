"use server";

import { getSession } from "@/lib/session";
import { s3Api, StorageFolder } from "@/services/s3/api";

export async function getPresignedUrl(params: {
    filename: string;
    contentType: string;
    context: StorageFolder;
}) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");
    const { userId } = session;

    return await s3Api.presignedUploadUrl({
        filename: params.filename,
        contentType: params.contentType,
        context: params.context,
        ownerId: userId,
    });
}

export async function getPresignedDownloadUrl(key: string) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    return await s3Api.presignedDownloadUrl({ key, expiresIn: 3600 });
}