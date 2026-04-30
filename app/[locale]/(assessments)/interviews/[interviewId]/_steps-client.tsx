"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { InterviewHeader } from "../_components/interview-header";
import {
  ArrowRightIcon,
  CameraIcon,
  FileTextIcon,
  LockIcon,
  VideoIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
} from "lucide-react";

type StepKey = "photo" | "resume" | "live" | "survey";

type Props = {
  interviewId: string;
  role: "worker" | "candidate";
  userName: string;
  backHref: string;
  title: string;
  subtitle: string;
  screeningDetails?: {
    title: string;
    description?: string | null;
    durationMins?: number | null;
    allowedLocales?: readonly string[];
  };
  hasPhoto: boolean;
  hasResume: boolean;
  interviewCompleted: boolean;
  onSavePhoto: (key: string) => Promise<{ error: true; message: string } | { error: false }>;
  durationMins: number;
  allowedLocales: readonly string[];
  savedLocale?: string;
};

function StepIcon({ step }: { step: StepKey }) {
  const Icon =
    step === "photo"
      ? CameraIcon
      : step === "resume"
        ? FileTextIcon
        : step === "live"
          ? VideoIcon
          : CheckCircle2Icon;
  return <Icon className="size-4 text-primary" aria-hidden />;
}

function statusForStep(
  step: StepKey,
  state: { hasPhoto: boolean; hasResume: boolean; interviewCompleted: boolean },
) {
  // Once the interview is completed, the earlier steps are frozen (non-clickable)
  // but should read as completed (not locked).
  if (state.interviewCompleted && (step === "photo" || step === "resume" || step === "live")) {
    return "completed";
  }

  if (step === "photo") return state.hasPhoto ? "done" : "todo";
  if (step === "resume") {
    if (!state.hasPhoto) return "blocked";
    return state.hasResume ? "done" : "todo";
  }
  // live (device + language + session) / survey once prerequisites are met
  if (step === "live") return state.hasPhoto && state.hasResume ? "todo" : "blocked";
  // Survey is available only after the interview is completed (live session finished).
  if (step === "survey") return state.interviewCompleted ? "todo" : "blocked";
  return "todo";
}

export function InterviewStepsClient(props: Props) {
  const t = useTranslations("assessments.interview.hub");
  const router = useRouter();

  const state = useMemo(
    () => ({
      hasPhoto: props.hasPhoto,
      hasResume: props.hasResume,
      interviewCompleted: props.interviewCompleted,
    }),
    [props.hasPhoto, props.hasResume, props.interviewCompleted],
  );

  const primaryHref = !props.hasPhoto
    ? `/interviews/${props.interviewId}/photo`
    : !props.hasResume
      ? `/interviews/${props.interviewId}/resume`
      : `/interviews/${props.interviewId}/setup`;

  const steps: { key: StepKey; title: string; detail: string; href: string }[] = [
    {
      key: "photo",
      title: t("steps.photo.title"),
      detail: t("steps.photo.detail"),
      href: `/interviews/${props.interviewId}/photo`,
    },
    {
      key: "resume",
      title: t("steps.resume.title"),
      detail: t("steps.resume.detail"),
      href: `/interviews/${props.interviewId}/resume`,
    },
    {
      key: "live",
      title: t("steps.live.title"),
      detail: t("steps.live.detail"),
      href: `/interviews/${props.interviewId}/setup`,
    },
    {
      key: "survey",
      title: t("steps.survey.title"),
      detail: t("steps.survey.detail"),
      href: `/interviews/${props.interviewId}/survey`,
    },
  ];

  return (
    <div className="min-h-svh bg-background">
      <InterviewHeader backHref={props.backHref} backTitle={t("backTitle")} />

      <main className="relative overflow-hidden">
        {/* soft light wash */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_10%_0%,hsl(var(--primary))/_0.10,transparent_60%),radial-gradient(50%_50%_at_90%_10%,rgb(59_130_246)_/_0.08,transparent_55%),radial-gradient(50%_50%_at_40%_100%,rgb(139_92_246)_/_0.07,transparent_55%)]"
          aria-hidden
        />

        <div className="mx-auto max-w-5xl px-4 pb-16 pt-10 md:px-6">
          <div className="mb-10 text-center">
            <Badge variant="outline" className="mb-3 border-primary/30 bg-primary/5 text-primary">
              {t("badge")}
            </Badge>
            <h1 className="mb-2 text-3xl font-semibold tracking-tight md:text-4xl">
              {props.title}
            </h1>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground md:text-base">
              {props.subtitle}
            </p>
          </div>

          <div className="mb-10 flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("stepsBadge")}
            </span>
            <Separator className="flex-1" />
          </div>

          {props.screeningDetails && (
            <div className="mb-10">
              <div className="mb-6 flex items-center gap-4">
                <Separator className="flex-1" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("screeningBadge")}
                </span>
                <Separator className="flex-1" />
              </div>

              <Card className="border-border bg-card/70 backdrop-blur">
                <CardHeader className="gap-1">
                  <CardTitle className="text-base">{props.screeningDetails.title}</CardTitle>
                  {props.screeningDetails.description ? (
                    <CardDescription className="leading-relaxed">
                      {props.screeningDetails.description}
                    </CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {typeof props.screeningDetails.durationMins === "number" ? (
                    <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">
                      {t("screeningDuration", { minutes: props.screeningDetails.durationMins })}
                    </Badge>
                  ) : null}
                  {props.screeningDetails.allowedLocales && props.screeningDetails.allowedLocales.length > 0 ? (
                    <Badge variant="outline" className="border-border bg-muted/40 text-muted-foreground">
                      {t("screeningLanguages", { count: props.screeningDetails.allowedLocales.length })}
                    </Badge>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {steps.map((s, idx) => {
              const status = statusForStep(s.key, state);
              const done = status === "done";
              const completed = status === "completed";
              const blocked = status === "blocked";

              return (
                <Card
                  key={s.key}
                  className={cn(
                    "group relative overflow-hidden border-border bg-card/70 backdrop-blur",
                    "motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:-translate-y-1",
                    (blocked || completed) && "opacity-60",
                  )}
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    aria-hidden
                  >
                    <div className="absolute -left-16 -top-16 size-48 rounded-full bg-primary/8 blur-2xl" />
                    <div className="absolute -right-16 -bottom-16 size-48 rounded-full bg-violet-500/8 blur-2xl" />
                  </div>

                  <CardHeader className="gap-2">
                    <div className="flex items-start gap-4">
                      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8">
                        <StepIcon step={s.key} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">
                            {t("stepNum", { num: idx + 1 })}
                          </span>
                          {done ? (
                            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/8 text-emerald-600">
                              {t("done")}
                            </Badge>
                          ) : completed ? (
                            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/8 text-emerald-600">
                              {t("completed")}
                            </Badge>
                          ) : blocked ? (
                            <Badge variant="outline" className="border-border bg-muted/40 text-muted-foreground">
                              {t("locked")}
                            </Badge>
                          ) : (
                            // Only show a positive status badge once the step is complete.
                            <span className="text-xs font-medium text-muted-foreground">
                              {t("incomplete")}
                            </span>
                          )}
                        </div>
                        <CardTitle className="mt-1 text-base">{s.title}</CardTitle>
                        <CardDescription className="mt-1 text-sm leading-relaxed">
                          {s.detail}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant={done ? "secondary" : "default"}
                      className="w-full"
                      disabled={blocked || completed}
                      onClick={() => router.push(s.href)}
                    >
                      {completed ? (
                        <>
                          <CheckCircle2Icon className="mr-2 size-4" aria-hidden />
                          {t("completed")}
                        </>
                      ) : blocked ? (
                        <>
                          <LockIcon className="mr-2 size-4" aria-hidden />
                          {t("locked")}
                        </>
                      ) : done ? (
                        <>
                          {t("view")}
                          <ArrowRightIcon className="ml-2 size-4" aria-hidden />
                        </>
                      ) : (
                        <>
                          {t("start")}
                          <ArrowRightIcon className="ml-2 size-4" aria-hidden />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-5 text-center">
            <p className="text-sm font-medium">
              {t("primaryCta.title", { name: props.userName })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("primaryCta.subtitle", { minutes: props.durationMins })}
            </p>
            <Button
              size="lg"
              className="w-full max-w-sm"
              onClick={() => router.push(primaryHref)}
            >
              <CircleDashedIcon className="mr-2 size-4 opacity-0 group-hover:opacity-100" aria-hidden />
              {t("primaryCta.button")}
              <ArrowRightIcon className="ml-2 size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

