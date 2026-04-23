"use client";

import { useVoice, VoiceReadyState } from "@humeai/voice-react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { errorToast } from "@/components/error-toast";
import { env } from "@/data/env/client";
import {
  CheckCircle2Icon,
  MicIcon,
  MicOffIcon,
  PhoneOffIcon,
  VideoIcon,
  VideoOffIcon,
  AlertTriangleIcon,
  CircleDashedIcon,
} from "lucide-react";
import { condenseChatMessages } from "@/services/hume/lib/condense-chat-messages";
import { CondensedMessages } from "@/services/hume/components/condensed-messages";
import {
  createAssessmentInterview,
  updateInterview,
} from "@/features/interviews/actions";
import type { InterviewSubjectRef } from "@/features/interviews/lib/interview-subject-ref";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BackLink } from "@/components/back-link";
import { Logo } from "@/components/logo";
import { INTERVIEW_DURATION_SECS, MIN_DURATION_FOR_COMPLETED_AT_SECS } from "@/lib/constants";

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
  subjectRef: InterviewSubjectRef;
  interviewId?: string;
  chatGroupId?: string;
  sessionVariables: Record<string, string>;
  user: { name: string; imageUrl: string };
  title: string;
  description: string;
  returnPath: string;
};

// ── Mic check (pre-interview) ────────────────────────────────────────────────

const MIC_THRESHOLD = 0.12;
const MIC_SUSTAIN_MS = 700;

/**
 * Opens the mic, exposes a normalized level (0-1) and a `passed` flag once the
 * user has spoken above {@link MIC_THRESHOLD} for {@link MIC_SUSTAIN_MS}
 * cumulatively. Releases the mic stream as soon as the check passes.
 */
function useMicCheck(enabled: boolean) {
  const [level, setLevel] = useState(0);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setLevel(0);
      setPassed(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || passed) return;

    let cancelled = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let raf = 0;
    let aboveSinceMs: number | null = null;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);

        const buf = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(buf);
          const avg = buf.reduce((a, b) => a + b, 0) / buf.length / 255;
          setLevel(avg);

          const now = performance.now();
          if (avg >= MIC_THRESHOLD) {
            if (aboveSinceMs == null) aboveSinceMs = now;
            else if (now - aboveSinceMs >= MIC_SUSTAIN_MS) {
              setPassed(true);
              return;
            }
          } else {
            aboveSinceMs = null;
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        /* permission denied — level stays 0 */
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
      ctx?.close().catch(() => {});
    };
  }, [enabled, passed]);

  return { level, passed };
}

// ── Device setup card ────────────────────────────────────────────────────────

type DeviceRowProps = {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  switchId: string;
  error?: string | null;
  children?: React.ReactNode;
};

function DeviceRow({
  icon,
  label,
  checked,
  onCheckedChange,
  switchId,
  error,
  children,
}: DeviceRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div className="flex items-center gap-3">
          {icon}
          <Label htmlFor={switchId} className="cursor-pointer">
            {label}
          </Label>
        </div>
        <Switch
          id={switchId}
          checked={checked}
          onCheckedChange={onCheckedChange}
        />
      </div>
      {error && (
        <p className="flex items-center gap-2 px-1 text-xs text-destructive">
          <AlertTriangleIcon className="size-3.5 shrink-0" />
          {error}
        </p>
      )}
      {children}
    </div>
  );
}

function MicCheckMeter({
  level,
  passed,
  hint,
  listening,
  passedLabel,
}: {
  level: number;
  passed: boolean;
  hint: string;
  listening: string;
  passedLabel: string;
}) {
  if (passed) {
    return (
      <p className="flex items-center gap-2 px-1 text-xs text-emerald-600">
        <CheckCircle2Icon className="size-3.5 shrink-0" />
        {passedLabel}
      </p>
    );
  }

  const fill = Math.min(1, level / MIC_THRESHOLD) * 100;
  const isListening = level > 0.02;

  return (
    <div className="space-y-1.5 px-1">
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-75"
          style={{ width: `${fill}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {isListening ? listening : hint}
      </p>
    </div>
  );
}

function DeviceSetupCard({
  title,
  description,
  onStart,
}: {
  title: string;
  description: string;
  onStart: () => Promise<void>;
}) {
  const t = useTranslations("assessments.interview.setup");
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const previewRef = useRef<HTMLVideoElement>(null);
  const camStreamRef = useRef<MediaStream | null>(null);

  const { level: micLevel, passed: micPassed } = useMicCheck(micOn);

  // Camera lifecycle — drives a preview stream while `camOn` is true.
  useEffect(() => {
    if (!camOn) {
      camStreamRef.current?.getTracks().forEach((track) => track.stop());
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
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        camStreamRef.current = stream;
        if (previewRef.current) previewRef.current.srcObject = stream;
        setCamError(null);
      } catch {
        setCamError(t("cameraDenied"));
        setCamOn(false);
      }
    })();

    return () => {
      cancelled = true;
      camStreamRef.current?.getTracks().forEach((track) => track.stop());
      camStreamRef.current = null;
    };
  }, [camOn, t]);

  const handleMicToggle = async (on: boolean) => {
    if (!on) {
      setMicOn(false);
      return;
    }
    try {
      const test = await navigator.mediaDevices.getUserMedia({ audio: true });
      test.getTracks().forEach((track) => track.stop());
      setMicError(null);
      setMicOn(true);
    } catch {
      setMicError(t("microphoneDenied"));
    }
  };

  const canStart = camOn && micOn && micPassed;

  return (
    <div className="flex min-h-svh flex-col p-4">
      <div className="flex items-center justify-between">
        <BackLink backHref="/dashboard/assessments" title="Assessments" />
        <Logo href="/dashboard/assessments" />
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription className="text-balance">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <p className="text-xs text-muted-foreground">
              {t("durationNotice", {
                minutes: INTERVIEW_DURATION_SECS / 60,
              })}
            </p>

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
                  <span className="text-xs">{t("cameraOff")}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <DeviceRow
                switchId="cam-switch"
                label={t("cameraLabel")}
                checked={camOn}
                onCheckedChange={setCamOn}
                error={camError}
                icon={
                  camOn ? (
                    <VideoIcon className="size-5 text-emerald-500" />
                  ) : (
                    <VideoOffIcon className="size-5 text-muted-foreground" />
                  )
                }
              />

              <DeviceRow
                switchId="mic-switch"
                label={t("microphoneLabel")}
                checked={micOn}
                onCheckedChange={handleMicToggle}
                error={micError}
                icon={
                  micOn ? (
                    <MicIcon
                      className={cn(
                        "size-5",
                        micPassed ? "text-emerald-500" : "text-primary",
                      )}
                    />
                  ) : (
                    <MicOffIcon className="size-5 text-muted-foreground" />
                  )
                }
              >
                {micOn && (
                  <MicCheckMeter
                    level={micLevel}
                    passed={micPassed}
                    hint={t("micCheckHint")}
                    listening={t("micCheckListening")}
                    passedLabel={t("micCheckPassed")}
                  />
                )}
              </DeviceRow>
            </div>

            <Button
              size="lg"
              disabled={!canStart || starting}
              onClick={async () => {
                setStarting(true);
                camStreamRef.current?.getTracks().forEach((track) => track.stop());
                camStreamRef.current = null;
                await onStart();
                setStarting(false);
              }}
              className="w-full"
            >
              {starting ? (
                <>
                  <CircleDashedIcon className="size-4 animate-spin" />
                  {t("starting")}
                </>
              ) : (
                t("start")
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Main shell ───────────────────────────────────────────────────────────────

export function InterviewShell({
  accessToken,
  subject,
  subjectRef,
  interviewId: initialInterviewId,
  chatGroupId,
  sessionVariables,
  user,
  title,
  description,
  returnPath,
}: InterviewShellProps) {
  const t = useTranslations("assessments.interview");
  const { connect, disconnect, readyState, chatMetadata, callDurationTimestamp } =
    useVoice();
  const [interviewId, setInterviewId] = useState<string | null>(
    initialInterviewId ?? null,
  );
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const durationRef = useRef<string | null>(null);
  const chatIdRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const closeTriggeredRef = useRef(false);
  const lastSyncedChatIdRef = useRef<string | null>(null);
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

  // Callback ref: as soon as the <video> element mounts, attach whatever
  // stream is currently active. This avoids the race where srcObject was
  // assigned before the element existed (which left the box blank).
  const attachVideoEl = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current && el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraEnabled(true);
    } catch {
      toast.error(t("controls.cameraDenied"));
    }
  }, [t]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraEnabled(false);
  }, []);

  const toggleCamera = useCallback(() => {
    if (cameraEnabled) stopCamera();
    else void startCamera();
  }, [cameraEnabled, startCamera, stopCamera]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Persist chatId/chatGroupId once per unique value. Guarded by a ref so the
  // hook never refires in a loop even if chatMetadata's identity churns.
  useEffect(() => {
    const chatId = chatMetadata?.chatId ?? null;
    const groupId = chatMetadata?.chatGroupId ?? null;
    if (chatId == null || interviewId == null) return;
    if (lastSyncedChatIdRef.current === chatId) return;
    lastSyncedChatIdRef.current = chatId;
    updateInterview(interviewId, {
      humeChatId: chatId,
      ...(groupId != null ? { chatGroupId: groupId } : {}),
    });
  }, [chatMetadata?.chatId, chatMetadata?.chatGroupId, interviewId]);

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

  // On disconnect: save final state, then redirect to the per-interview review
  // page where feedback is streamed in. The feedback generation itself lives
  // on that page so users see progress immediately.
  useEffect(() => {
    if (readyState !== VoiceReadyState.CLOSED) return;
    if (closeTriggeredRef.current) return;

    if (interviewId == null) {
      toast.error(t("interviewNotFound"));
      router.push(returnPath);
      return;
    }

    closeTriggeredRef.current = true;

    const finalDuration = durationRef.current;
    const finalChatId = chatIdRef.current;

    (async () => {
      setFinalizing(true);
      const chatSeconds = parseDurationToSeconds(finalDuration);
      const patch: {
        duration?: string;
        humeChatId?: string;
        completedAt?: string;
      } = {};
      if (finalDuration) patch.duration = finalDuration;
      if (finalChatId) patch.humeChatId = finalChatId;
      if (chatSeconds > MIN_DURATION_FOR_COMPLETED_AT_SECS) {
        patch.completedAt = new Date().toISOString();
      }

      await updateInterview(interviewId, patch);
      stopCamera();
      router.push(`/interviews/${interviewId}`);
    })();
  }, [interviewId, readyState, router, returnPath, stopCamera]);

  const handleStart = async () => {
    await startCamera();

    let activeInterviewId = interviewId;
    if (activeInterviewId == null) {
      const res = await createAssessmentInterview({ subject, subjectRef });
      if (res.error) {
        return errorToast(res.message);
      }
      activeInterviewId = res.id;
      setInterviewId(activeInterviewId);
    }

    connect({
      auth: { type: "accessToken", value: accessToken },
      configId:
        subject === "profession"
          ? env.NEXT_PUBLIC_HUME_CONFIG_ID_PROFESSION
          : env.NEXT_PUBLIC_HUME_CONFIG_ID_RESUME,
      sessionSettings: {
        type: "session_settings",
        variables: {
          ...sessionVariables,
          duration: INTERVIEW_DURATION_SECS / 60,
        },
      },
      resumedChatGroupId: chatGroupId ?? undefined,
    }).catch((error) => {
      console.error("error connecting", error);
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

  if (finalizing) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4">
        <CircleDashedIcon className="size-10 animate-spin" />
        <p className="text-lg font-medium">{t("completed.title")}</p>
        <p className="text-sm text-muted-foreground">
          {t("completed.wrappingUp")}
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
        <CircleDashedIcon className="size-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-svh flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-6">
        <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-end pb-6">
          <Messages user={user} />
        </div>
      </div>

      <div className="shrink-0 flex justify-center px-4 pb-6">
        <Controls
          cameraEnabled={cameraEnabled}
          remaining={remaining}
          onToggleCamera={toggleCamera}
        />
      </div>

      {cameraEnabled && (
        <video
          ref={attachVideoEl}
          autoPlay
          playsInline
          muted
          className="fixed bottom-24 right-4 z-50 h-32 w-44 rounded-lg border bg-black object-cover shadow-lg"
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
  const maxFft = useMemo(
    () => (fft.length > 0 ? Math.max(...fft) : 0),
    [fft],
  );

  // Auto-scroll to the latest message whenever the message list grows.
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [condensedMessages.length]);

  return (
    <>
      <CondensedMessages
        messages={condensedMessages}
        user={user}
        maxFft={maxFft}
        className="w-full"
      />
      <div ref={bottomRef} aria-hidden className="h-0" />
    </>
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
  const t = useTranslations("assessments.interview.controls");
  const { disconnect, isMuted, mute, unmute, micFft } = useVoice();
  const timeLow = remaining <= 60;

  return (
    <div className="flex w-fit items-center gap-4 rounded-full border bg-background/95 px-4 py-2 shadow-lg backdrop-blur">
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
        <span className="sr-only">
          {isMuted ? t("unmute") : t("mute")}
        </span>
      </Button>

      <Button variant="ghost" size="icon" onClick={onToggleCamera}>
        {cameraEnabled ? (
          <VideoIcon />
        ) : (
          <VideoOffIcon className="text-destructive" />
        )}
        <span className="sr-only">
          {cameraEnabled ? t("disableCamera") : t("enableCamera")}
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
        {t("timeLeft", { time: formatCountdown(remaining) })}
      </div>

      <Button variant="ghost" size="icon" onClick={disconnect}>
        <PhoneOffIcon className="text-destructive" />
        <span className="sr-only">{t("endCall")}</span>
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
