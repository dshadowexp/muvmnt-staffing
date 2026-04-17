"use client";

import { useVoice, VoiceReadyState } from "@humeai/voice-react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { errorToast } from "@/components/error-toast";
import { env } from "@/data/env/client";
import {
  Loader2Icon,
  MicIcon,
  MicOffIcon,
  PhoneOffIcon,
  VideoIcon,
  VideoOffIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { condenseChatMessages } from "@/services/hume/lib/condense-chat-messages";
import { CondensedMessages } from "@/services/hume/components/condensed-messages";
import {
  createAssessmentInterview,
  updateInterview,
  generateInterviewFeedback,
} from "@/features/interviews/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const INTERVIEW_DURATION_SECS = 10 * 60;

function parseDurationToSeconds(ts: string | null | undefined): number {
  if (!ts) return 0;
  const parts = ts.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type InterviewShellProps = {
  accessToken: string;
  subject: string;
  subjectRef: string;
  sessionVariables: Record<string, string>;
  user: { name: string; imageUrl: string };
  title: string;
  description: string;
  returnPath: string;
};

// ── Mic level meter (pre-interview test) ─────────────────────────────────────

function useMicLevel(enabled: boolean) {
  const [level, setLevel] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      setLevel(0);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const ctx = new AudioContext();
        ctxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);

        const buf = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(buf);
          const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
          setLevel(avg / 255);
          animRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        /* permission denied — level stays 0 */
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      ctxRef.current?.close();
      ctxRef.current = null;
      setLevel(0);
    };
  }, [enabled]);

  return level;
}

// ── Device setup card ────────────────────────────────────────────────────────

function DeviceSetupCard({
  title,
  description,
  onStart,
}: {
  title: string;
  description: string;
  onStart: () => void;
}) {
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const previewRef = useRef<HTMLVideoElement>(null);
  const camStreamRef = useRef<MediaStream | null>(null);

  const micLevel = useMicLevel(micOn);

  // Camera toggle
  useEffect(() => {
    if (!camOn) {
      camStreamRef.current?.getTracks().forEach((t) => t.stop());
      camStreamRef.current = null;
      if (previewRef.current) previewRef.current.srcObject = null;
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        camStreamRef.current = stream;
        if (previewRef.current) previewRef.current.srcObject = stream;
        setCamError(null);
      } catch {
        setCamError("Camera access denied.");
        setCamOn(false);
      }
    })();

    return () => {
      cancelled = true;
      camStreamRef.current?.getTracks().forEach((t) => t.stop());
      camStreamRef.current = null;
    };
  }, [camOn]);

  // Mic permission check on toggle
  const handleMicToggle = async (on: boolean) => {
    if (on) {
      try {
        const test = await navigator.mediaDevices.getUserMedia({ audio: true });
        test.getTracks().forEach((t) => t.stop());
        setMicError(null);
        setMicOn(true);
      } catch {
        setMicError("Microphone access denied.");
      }
    } else {
      setMicOn(false);
    }
  };

  const canStart = micOn && camOn;

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="text-balance">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <p className="text-xs text-muted-foreground">
              This interview is 10 minutes. Enable both devices before starting.
          </p>
          {/* Camera preview */}
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
            {camOn ? (
              <video
                ref={previewRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <VideoOffIcon className="size-10 opacity-40" />
                <span className="text-xs">Camera off</span>
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            {/* Camera switch */}
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div className="flex items-center gap-3">
                {camOn ? (
                  <VideoIcon className="size-5 text-emerald-500" />
                ) : (
                  <VideoOffIcon className="size-5 text-muted-foreground" />
                )}
                <Label htmlFor="cam-switch" className="cursor-pointer">
                  Camera
                </Label>
              </div>
              <Switch
                id="cam-switch"
                checked={camOn}
                onCheckedChange={setCamOn}
              />
            </div>
            {camError && (
              <p className="flex items-center gap-2 px-1 text-sm text-destructive">
                <AlertTriangleIcon className="size-4 shrink-0" />
                {camError}
              </p>
            )}

            {/* Microphone switch */}
            {/* Mic level meter */}
            {micOn && (
              <div className="space-y-1.5 px-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Audio level
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {micLevel > 0.02 ? "Receiving audio" : "Speak to test…"}
                  </span>
                </div>
                <div className="flex h-3 gap-[3px] rounded">
                  {Array.from({ length: 20 }).map((_, i) => {
                    const threshold = (i + 1) / 20;
                    const active = micLevel >= threshold;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex-1 rounded-sm transition-colors duration-75",
                          active
                            ? i < 14
                              ? "bg-emerald-500"
                              : i < 17
                                ? "bg-amber-500"
                                : "bg-red-500"
                            : "bg-muted",
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            )}
            {micError && (
              <p className="flex items-center gap-2 px-1 text-sm text-destructive">
                <AlertTriangleIcon className="size-4 shrink-0" />
                {micError}
              </p>
            )}
            
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div className="flex items-center gap-3">
                {micOn ? (
                  <MicIcon className="size-5 text-emerald-500" />
                ) : (
                  <MicOffIcon className="size-5 text-muted-foreground" />
                )}
                <Label htmlFor="mic-switch" className="cursor-pointer">
                  Microphone
                </Label>
              </div>
              <Switch
                id="mic-switch"
                checked={micOn}
                onCheckedChange={handleMicToggle}
              />
            </div>

            
          </div>

          <Button
            size="lg"
            disabled={!canStart || starting}
            onClick={() => {
              setStarting(true);
              // Stop the preview streams — the interview will open its own
              camStreamRef.current?.getTracks().forEach((t) => t.stop());
              camStreamRef.current = null;
              onStart();
            }}
            className="w-full"
          >
            {starting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Starting…
              </>
            ) : (
              "Start interview"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main shell ───────────────────────────────────────────────────────────────

export function InterviewShell({
  accessToken,
  subject,
  subjectRef,
  sessionVariables,
  user,
  title,
  description,
  returnPath,
}: InterviewShellProps) {
  const { connect, disconnect, readyState, chatMetadata, callDurationTimestamp } =
    useVoice();
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [generatingFeedback, setGeneratingFeedback] = useState(false);
  const durationRef = useRef<string | null>(null);
  const chatIdRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const feedbackTriggeredRef = useRef(false);
  const router = useRouter();

  // Only keep the latest non-null values so disconnect resets don't wipe them
  if (callDurationTimestamp) {
    durationRef.current = callDurationTimestamp;
  }
  if (chatMetadata?.chatId) {
    chatIdRef.current = chatMetadata.chatId;
  }

  const elapsed = parseDurationToSeconds(callDurationTimestamp);
  const remaining = Math.max(0, INTERVIEW_DURATION_SECS - elapsed);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 320, height: 240 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraEnabled(true);
      setCameraError(null);
    } catch {
      setCameraError("Camera access denied. Please enable camera to proceed.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraEnabled(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Persist chatId to DB as soon as it's available
  useEffect(() => {
    const chatId = chatMetadata?.chatId;
    if (chatId == null || interviewId == null) return;
    updateInterview(interviewId, { humeChatId: chatId });
  }, [chatMetadata?.chatId, interviewId]);

  // Persist duration to DB every 10 seconds
  useEffect(() => {
    if (interviewId == null) return;
    const intervalId = setInterval(() => {
      if (durationRef.current == null) return;
      updateInterview(interviewId, { duration: durationRef.current });
    }, 10000);
    return () => clearInterval(intervalId);
  }, [interviewId]);

  // Auto-disconnect when time is up
  useEffect(() => {
    if (interviewId == null) return;
    if (remaining <= 0 && elapsed > 0) {
      disconnect();
    }
  }, [remaining, elapsed, disconnect, interviewId]);

  // On disconnect: save final state, generate feedback, redirect to hub
  useEffect(() => {
    if (readyState !== VoiceReadyState.CLOSED) return;
    if (feedbackTriggeredRef.current) return;

    if (interviewId == null) {
      router.push(returnPath);
      return;
    }

    feedbackTriggeredRef.current = true;

    const finalDuration = durationRef.current;
    const finalChatId = chatIdRef.current;

    (async () => {
      const patch: {
        duration?: string;
        humeChatId?: string;
        completedAt: string;
      } = { completedAt: new Date().toISOString() };
      if (finalDuration) patch.duration = finalDuration;
      if (finalChatId) patch.humeChatId = finalChatId;

      await updateInterview(interviewId, patch);

      stopCamera();
      setGeneratingFeedback(true);
      await generateInterviewFeedback(interviewId);
      router.push(returnPath);
    })();
  }, [interviewId, readyState, router, returnPath, stopCamera]);

  const handleStart = async () => {
    await startCamera();
    const res = await createAssessmentInterview({ subject, subjectRef });
    if (res.error) {
      return errorToast(res.message);
    }
    setInterviewId(res.id);

    connect({
      auth: { type: "accessToken", value: accessToken },
      configId:  subject === "profession" ? env.NEXT_PUBLIC_HUME_CONFIG_ID_PROFESSION : env.NEXT_PUBLIC_HUME_CONFIG_ID_RESUME,
      sessionSettings: {
        type: "session_settings",
        variables: sessionVariables,
      },
    }).catch((error) => {
      errorToast(error.message);
    });
  };

  if (readyState === VoiceReadyState.IDLE) {
    return (
      <DeviceSetupCard
        title={title}
        description={description}
        onStart={handleStart}
      />
    );
  }

  if (generatingFeedback) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4">
        <Loader2Icon className="size-16 animate-spin" />
        <p className="text-lg font-medium">Interview complete</p>
        <p className="text-sm text-muted-foreground">
          Generating your feedback — this may take a moment…
        </p>
      </div>
    );
  }

  if (
    readyState === VoiceReadyState.CONNECTING ||
    readyState === VoiceReadyState.CLOSED
  ) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2Icon className="size-24 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col">
      <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto p-4">
        <div className="mx-auto flex w-full max-w-5xl flex-col justify-end gap-4 py-6">
          <Messages user={user} />
          <Controls
            cameraEnabled={cameraEnabled}
            remaining={remaining}
            onToggleCamera={() =>
              cameraEnabled ? stopCamera() : startCamera()
            }
          />
        </div>
      </div>
      {cameraEnabled && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="fixed bottom-20 right-4 z-50 h-32 w-44 rounded-lg border bg-black object-cover shadow-lg"
        />
      )}
    </div>
  );
}

function Messages({ user }: { user: { name: string; imageUrl: string } }) {
  const { messages, fft } = useVoice();
  const condensedMessages = useMemo(
    () => condenseChatMessages(messages),
    [messages],
  );
  return (
    <CondensedMessages
      messages={condensedMessages}
      user={user}
      maxFft={Math.max(...fft)}
      className="max-w-5xl"
    />
  );
}

function Controls({
  cameraEnabled,
  remaining,
  onToggleCamera,
}: {
  cameraEnabled: boolean;
  remaining: number;
  onToggleCamera: () => void;
}) {
  const { disconnect, isMuted, mute, unmute, micFft } = useVoice();
  const timeLow = remaining <= 60;

  return (
    <div className="sticky bottom-6 flex w-fit items-center gap-4 rounded-lg border bg-background px-4 py-2 shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => (isMuted ? unmute() : mute())}
      >
        {isMuted ? (
          <MicOffIcon className="text-destructive" />
        ) : (
          <MicIcon />
        )}
        <span className="sr-only">{isMuted ? "Unmute" : "Mute"}</span>
      </Button>

      <Button variant="ghost" size="icon" onClick={onToggleCamera}>
        {cameraEnabled ? (
          <VideoIcon />
        ) : (
          <VideoOffIcon className="text-destructive" />
        )}
        <span className="sr-only">
          {cameraEnabled ? "Disable camera" : "Enable camera"}
        </span>
      </Button>

      <div className="self-stretch">
        <FftVisualizer fft={micFft} />
      </div>

      <div
        className={cn(
          "flex items-center gap-1.5 text-sm tabular-nums",
          timeLow
            ? "font-semibold text-destructive"
            : "text-muted-foreground",
        )}
      >
        {formatCountdown(remaining)} left
      </div>

      <Button variant="ghost" size="icon" onClick={disconnect}>
        <PhoneOffIcon className="text-destructive" />
        <span className="sr-only">End call</span>
      </Button>
    </div>
  );
}

function FftVisualizer({ fft }: { fft: number[] }) {
  return (
    <div className="flex h-full items-center gap-1">
      {fft.map((value, index) => {
        const percent = (value / 4) * 100;
        return (
          <div
            key={index}
            className="min-h-0.5 w-0.5 rounded bg-primary/75"
            style={{ height: `${percent < 10 ? 0 : percent}%` }}
          />
        );
      })}
    </div>
  );
}
