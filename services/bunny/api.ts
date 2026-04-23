"use server";

import { env } from "@/data/env/server";

// Step 1 — called from browser to get upload credentials
export async function createBunnyVideo(interviewId: string): Promise<{
    videoId:    string;
    uploadUrl:  string;
    accessKey:  string;
    playbackUrl: string;
}> {
    const res = await fetch(
        `https://video.bunnycdn.com/library/${env.BUNNY_STREAM_LIBRARY_ID}/videos`,
        {
            method:  "POST",
            headers: {
                AccessKey:      env.BUNNY_STREAM_API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ title: `interview-${interviewId}` }),
        },
    );

    if (!res.ok) throw new Error("Failed to create Bunny video");
    const { guid } = await res.json();

    return {
        videoId:     guid,
        uploadUrl:   `https://video.bunnycdn.com/library/${env.BUNNY_STREAM_LIBRARY_ID}/videos/${guid}`,
        accessKey:   env.BUNNY_STREAM_API_KEY, // safe — Bunny Stream keys are write-only upload keys
        playbackUrl: `https://iframe.mediadelivery.net/embed/${env.BUNNY_STREAM_LIBRARY_ID}/${guid}`,
    };
}

export async function getVideoUploadUrl(interviewId: string): Promise<{
    uploadUrl: string;
    videoId:   string;
    playbackUrl: string;
}> {
    // 1. Create a video object in Bunny Stream
    const createRes = await fetch(
        `https://video.bunnycdn.com/library/${env.BUNNY_STREAM_LIBRARY_ID}/videos`,
        {
            method:  "POST",
            headers: {
                AccessKey:     env.BUNNY_STREAM_API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ title: `interview-${interviewId}` }),
        },
    );

    if (!createRes.ok) throw new Error("Failed to create Bunny video object");
    const { guid } = await createRes.json();

    return {
        videoId:     guid,
        uploadUrl:   `https://video.bunnycdn.com/library/${env.BUNNY_STREAM_LIBRARY_ID}/videos/${guid}`,
        playbackUrl: `https://iframe.mediadelivery.net/embed/${env.BUNNY_STREAM_LIBRARY_ID}/${guid}`,
    };
}

export async function uploadRecordingToBunny(params: {
    interviewId: string;
    blob:        Blob;
}): Promise<{ videoId: string; playbackUrl: string }> {
    const { uploadUrl, videoId, playbackUrl } = await getVideoUploadUrl(params.interviewId);

    const uploadRes = await fetch(uploadUrl, {
        method:  "PUT",
        headers: {
            AccessKey: env.BUNNY_STREAM_API_KEY,
        },
        body: params.blob,
    });

    if (!uploadRes.ok) throw new Error("Failed to upload recording to Bunny");

    return { videoId, playbackUrl };
}