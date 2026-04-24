import { useCallback, useEffect, useRef, useState } from "react";
import {
    initiateInterviewRecording,
    presignInterviewPart,
    finalizeInterviewRecording,
    abortInterviewRecording,
} from "../actions";

// S3 requires every part except the final one to be at least 5 MB.
const MIN_PART_BYTES = 5 * 1024 * 1024;

type UploadedPart = { PartNumber: number; ETag: string };

export function useRecorder(interviewId: string | null) {
    const recorderRef    = useRef<MediaRecorder | null>(null);
    const combinedRef    = useRef<MediaStream | null>(null);
    const interviewIdRef = useRef<string | null>(interviewId);

    // Multipart upload state — reset on each start()
    const uploadIdRef   = useRef<string | null>(null);
    const keyRef        = useRef<string | null>(null);
    const mimeTypeRef   = useRef<string>("");
    const partNumberRef = useRef(0);
    const pendingChunks = useRef<Blob[]>([]);
    const pendingBytes  = useRef(0);
    const partPromises  = useRef<Promise<UploadedPart>[]>([]);

    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        interviewIdRef.current = interviewId;
    }, [interviewId]);

    /**
     * Upload one blob directly from the browser to S3 via a short-lived
     * presigned URL. Returns the part's PartNumber + ETag for the final
     * CompleteMultipartUpload call.
     */
    const uploadPart = useCallback(async (
        blob: Blob,
        partNumber: number,
    ): Promise<UploadedPart> => {
        const key      = keyRef.current!;
        const uploadId = uploadIdRef.current!;

        const signed = await presignInterviewPart(key, uploadId, partNumber);
        if (signed.error) throw new Error(signed.message);

        const res = await fetch(signed.url, {
            method:  "PUT",
            body:    blob,
            headers: { "Content-Type": blob.type || "application/octet-stream" },
        });
        if (!res.ok) throw new Error(`Part ${partNumber} upload failed (${res.status})`);

        // S3 CORS must include `ExposeHeaders: ['ETag']` for this to work.
        const etag = res.headers.get("ETag");
        if (!etag) throw new Error(`Part ${partNumber}: missing ETag in response`);

        return { PartNumber: partNumber, ETag: etag };
    }, []);

    /**
     * Snapshot the current pending buffer, increment the part counter, and
     * kick off an async upload. The promise is tracked in partPromises so
     * stop() can await them all.
     */
    const flushPart = useCallback(() => {
        const chunks = pendingChunks.current.splice(0);   // snapshot + clear
        pendingBytes.current = 0;
        partNumberRef.current += 1;

        const partNumber = partNumberRef.current;
        const blob = new Blob(chunks, { type: mimeTypeRef.current });
        partPromises.current.push(uploadPart(blob, partNumber));
    }, [uploadPart]);

    const start = useCallback(async (camStream: MediaStream | null) => {
        // Reset all multipart state from any previous session
        uploadIdRef.current   = null;
        keyRef.current        = null;
        mimeTypeRef.current   = "";
        partNumberRef.current = 0;
        pendingChunks.current = [];
        pendingBytes.current  = 0;
        partPromises.current  = [];

        // Always capture mic; combine with camera if available
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const tracks = [
            ...micStream.getAudioTracks(),
            ...(camStream?.getVideoTracks() ?? []),
        ];
        const combined = new MediaStream(tracks);
        combinedRef.current = combined;

        // Pick the best supported container format
        const mimeType = [
            "video/webm;codecs=vp9,opus",
            "video/webm;codecs=vp8,opus",
            "video/webm",
            "video/mp4",
        ].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
        mimeTypeRef.current = mimeType;

        const currentId = interviewIdRef.current;
        if (!currentId) throw new Error("No interview ID");

        // Initiate the S3 multipart upload session before recording starts
        const init = await initiateInterviewRecording(currentId, mimeType || "video/webm");
        if (init.error) throw new Error(init.message);
        uploadIdRef.current = init.uploadId;
        keyRef.current      = init.key;

        const recorder = new MediaRecorder(combined, {
            mimeType,
            videoBitsPerSecond: 1_000_000, // 1 Mbps — good balance for interviews
        });

        recorder.ondataavailable = (e) => {
            if (e.data.size === 0) return;
            pendingChunks.current.push(e.data);
            pendingBytes.current += e.data.size;

            // Upload to S3 as a part whenever the buffer hits the 5 MB minimum.
            // At 1 Mbps this fires roughly every 40 s — well before the interview ends.
            if (pendingBytes.current >= MIN_PART_BYTES) {
                flushPart();
            }
        };

        recorder.start(5_000); // emit a chunk every 5 seconds
        recorderRef.current = recorder;
    }, [flushPart]);

    const stop = useCallback(async (): Promise<string | null> => {
        const recorder  = recorderRef.current;
        const currentId = interviewIdRef.current;

        if (!recorder || recorder.state === "inactive") return null;
        if (!currentId) return null;

        return new Promise((resolve) => {
            recorder.onstop = async () => {
                // Release camera / mic
                combinedRef.current?.getTracks().forEach((t) => t.stop());
                combinedRef.current = null;

                const key      = keyRef.current;
                const uploadId = uploadIdRef.current;

                if (!key || !uploadId) {
                    resolve(null);
                    return;
                }

                try {
                    setUploading(true);

                    // Flush any remaining buffer as the final part.
                    // The last part is allowed to be < 5 MB — that's the S3 exception.
                    if (pendingBytes.current > 0) {
                        flushPart();
                    }

                    // Wait for every in-flight part to finish
                    const parts = await Promise.all(partPromises.current);

                    // CompleteMultipartUpload requires parts sorted by PartNumber
                    parts.sort((a, b) => a.PartNumber - b.PartNumber);

                    const result = await finalizeInterviewRecording(
                        currentId,
                        key,
                        uploadId,
                        parts,
                    );
                    if (result.error) throw new Error(result.message);

                    resolve(result.recordingUrl);
                } catch (err) {
                    console.error("Recording upload failed", err);
                    // Best-effort abort so S3 doesn't accumulate orphaned parts
                    void abortInterviewRecording(key, uploadId);
                    resolve(null);
                } finally {
                    setUploading(false);
                }
            };

            recorder.stop();
        });
    }, [flushPart]);

    return { start, stop, uploading };
}
