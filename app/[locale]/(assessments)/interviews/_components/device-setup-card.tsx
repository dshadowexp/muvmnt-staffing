"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  MicIcon,
  MicOffIcon,
  VideoIcon,
  VideoOffIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { routing } from "@/i18n/routing";

const MIC_THRESHOLD = 0.18;
const MIC_SUSTAIN_MS = 600;

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  fr: "Français",
};

function LanguageSelector({
  value,
  onChange,
  allowedLocales,
}: {
  value: string;
  onChange: (locale: string) => void;
  allowedLocales: readonly string[];
}) {
  const visibleLocales = routing.locales.filter((l) => allowedLocales.includes(l));
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {visibleLocales.map((locale) => (
          <SelectItem key={locale} value={locale}>
            {LOCALE_LABELS[locale] ?? locale.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Opens the mic, exposes a normalized level (0-1) and a `passed` flag once the
 * user has spoken above MIC_THRESHOLD for MIC_SUSTAIN_MS cumulatively.
 */
function useMicCheck(enabled: boolean) {
  const [rawLevel, setRawLevel] = useState(0);
  const [rawPassed, setRawPassed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (rawPassed) return;

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
        if (ctx.state === "suspended") await ctx.resume();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);

        const buf = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(buf);
          const avg = buf.reduce((a, b) => a + b, 0) / buf.length / 255;
          setRawLevel(avg);

          const now = performance.now();
          if (avg >= MIC_THRESHOLD) {
            if (aboveSinceMs == null) aboveSinceMs = now;
            else if (now - aboveSinceMs >= MIC_SUSTAIN_MS) {
              setRawPassed(true);
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
  }, [enabled, rawPassed]);

  return {
    // When disabled, surface neutral values without synchronously mutating state.
    level: enabled ? rawLevel : 0,
    passed: enabled ? rawPassed : false,
  };
}

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

export function DeviceSetupCard({
  onStart,
  onBack,
  isResuming = false,
  selectedLocale,
  onLocaleChange,
  savedLocale,
  allowedLocales,
}: {
  onStart: () => Promise<void>;
  onBack?: () => void;
  isResuming?: boolean;
  selectedLocale: string;
  onLocaleChange: (locale: string) => void;
  savedLocale?: string;
  allowedLocales: readonly string[];
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
    <Card className="w-full max-w-lg lg:h-full">
      <CardContent className="flex h-full flex-col justify-between gap-5">
        <div>
          {isResuming && savedLocale ? (
            <div className="w-full space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t("languageLabel")}
              </p>
              <div className="flex items-center rounded-md border px-3 py-2 text-sm text-muted-foreground">
                {LOCALE_LABELS[savedLocale] ?? savedLocale.toUpperCase()}
              </div>
            </div>
          ) : !isResuming && allowedLocales.length === 1 ? (
            <div className="w-full space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t("languageLabel")}
              </p>
              <div className="flex items-center rounded-md border px-3 py-2 text-sm text-muted-foreground">
                {LOCALE_LABELS[allowedLocales[0]] ?? allowedLocales[0].toUpperCase()}
              </div>
            </div>
          ) : !isResuming ? (
            <div className="w-full space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t("languageLabel")}
              </p>
              <LanguageSelector
                value={selectedLocale}
                onChange={onLocaleChange}
                allowedLocales={allowedLocales}
              />
            </div>
          ) : null}

          {isResuming ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/30">
              <p className="text-xs font-medium text-blue-800 dark:text-blue-400">
                Your interview was interrupted — your progress has been saved.
                Enable your camera and mic to pick up where you left off.
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-start justify-center gap-5">
          <p className="text-xs text-muted-foreground">{t("durationNotice")}</p>

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

          <div className="w-full space-y-3">
            <DeviceRow
              switchId="cam-switch"
              label={t("cameraLabel")}
              checked={camOn}
              onCheckedChange={setCamOn}
              error={camError}
              icon={
                camOn ? (
                  <VideoIcon className="size-5 text-primary" />
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
            ) : isResuming ? (
              t("resume")
            ) : (
              t("start")
            )}
          </Button>

          {onBack && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={onBack}
            >
              <ArrowLeftIcon className="size-4" />
              {t("backToResume")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

