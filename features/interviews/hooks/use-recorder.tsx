import { createBunnyVideo } from "@/services/bunny/api";
import { useCallback, useRef, useState } from "react";
import { updateInterview } from "../actions";

export function useRecorder(interviewId: string | null) {
    const chunksRef   = useRef<Blob[]>([]);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const [uploading, setUploading] = useState(false);

    const start = useCallback(async (camStream: MediaStream | null) => {
        chunksRef.current = [];

        // Always capture mic; combine with camera if available
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const tracks    = [
            ...micStream.getAudioTracks(),
            ...(camStream?.getVideoTracks() ?? []),
        ];

        const combined = new MediaStream(tracks);

        // Pick the best supported format
        const mimeType = [
            "video/webm;codecs=vp9,opus",
            "video/webm;codecs=vp8,opus",
            "video/webm",
            "video/mp4",
        ].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";

        const recorder = new MediaRecorder(combined, {
            mimeType,
            videoBitsPerSecond: 1_000_000, // 1 Mbps — good balance for interviews
        });

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.start(5000); // collect a chunk every 5 seconds
        recorderRef.current = recorder;
    }, []);

    const stop = useCallback(async (): Promise<string | null> => {
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === "inactive") return null;
        if (!interviewId) return null;
    
        return new Promise((resolve) => {
            recorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
                chunksRef.current = [];
    
                try {
                    setUploading(true);
    
                    // 1. Get upload credentials from server (tiny request, no blob)
                    const { videoId, uploadUrl, accessKey, playbackUrl } =
                        await createBunnyVideo(interviewId);
    
                    // 2. Upload blob DIRECTLY from browser → Bunny (bypasses Next.js entirely)
                    const uploadRes = await fetch(uploadUrl, {
                        method:  "PUT",
                        headers: { AccessKey: accessKey },
                        body:    blob,             // ← goes straight to Bunny, not through server action
                    });
    
                    if (!uploadRes.ok) throw new Error("Bunny upload failed");
    
                    // 3. Save the playback URL to DB via server action (tiny string, fine)
                    await updateInterview(interviewId, { recordingUrl: playbackUrl });
    
                    resolve(playbackUrl);
                } catch (err) {
                    console.error("Recording upload failed", err);
                    resolve(null);
                } finally {
                    setUploading(false);
                }
            };
    
            recorder.stop();
        });
    }, [interviewId]);
    

    return { start, stop, uploading };
}