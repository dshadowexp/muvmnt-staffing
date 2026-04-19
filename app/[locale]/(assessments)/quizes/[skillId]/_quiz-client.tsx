"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { submitQuiz, saveQuizProgress } from "@/features/quizes/actions";
import { streamQuizQuestions } from "@/features/quizes/lib/stream-quiz-questions";
import { errorToast } from "@/components/error-toast";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  Loader2Icon,
  ArrowRightIcon,
  TrophyIcon,
  RotateCcwIcon,
} from "lucide-react";
import type { QuizQuestion } from "@/services/ai/quizes";
import Link from "next/link";

const TOTAL_TIME_MS = 15 * 60 * 1000;
const DEFAULT_PENDING_TIME_SECONDS = 60;

type Props = {
  quizId: string;
  questions: QuizQuestion[];
  skillName: string;
  /** When true, remaining questions stream in via the /api/ai route. */
  deferredQuestionLoad: boolean;
  expectedQuestionCount: number;
  /** Previously-saved answers when resuming an in-progress quiz after reload. */
  initialAnswers?: Record<number, number[]>;
};

type QuizState = "taking" | "submitting" | "results";
type QuizResult = { score: number; passed: boolean; total: number };

/** Index of the first question that does not yet have a saved answer. */
function firstUnansweredIndex(
  answers: Record<number, number[]>,
  loadedCount: number,
): number {
  for (let i = 0; i < loadedCount; i++) {
    const a = answers[i];
    if (!a || a.length === 0) return i;
  }
  return loadedCount;
}

export function QuizClient({
  quizId,
  questions: initialQuestions,
  skillName,
  deferredQuestionLoad,
  expectedQuestionCount,
  initialAnswers,
}: Props) {
  const router = useRouter();
  const t = useTranslations("assessments.quiz");
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuestions);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(deferredQuestionLoad);
  const resumeIndex = firstUnansweredIndex(
    initialAnswers ?? {},
    initialQuestions.length,
  );
  const [currentIndex, setCurrentIndex] = useState(resumeIndex);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, number[]>
  >(initialAnswers ?? {});
  const [questionTimeLeft, setQuestionTimeLeft] = useState(
    initialQuestions[resumeIndex]?.timeSeconds ?? DEFAULT_PENDING_TIME_SECONDS,
  );
  const [totalTimeLeft, setTotalTimeLeft] = useState(TOTAL_TIME_MS / 1000);
  const [state, setState] = useState<QuizState>("taking");
  const [result, setResult] = useState<QuizResult | null>(null);
  const autoAdvanceRef = useRef(false);
  const lastSavedAnswersRef = useRef<string>(
    JSON.stringify(initialAnswers ?? {}),
  );

  const consumeStream = useCallback(
    (signal?: AbortSignal) => {
      setStreaming(true);
      setStreamError(null);
      return streamQuizQuestions({
        quizId,
        signal,
        onEvent: (event) => {
          if (signal?.aborted) return;
          if (event.type === "ready") {
            setQuestions((prev) =>
              event.questions.length > prev.length ? event.questions : prev,
            );
            return;
          }
          if (event.type === "batch") {
            setQuestions((prev) => [...prev, ...event.questions]);
            return;
          }
          if (event.type === "error") {
            setStreamError(event.message);
            setStreaming(false);
            return;
          }
          if (event.type === "done") {
            setStreaming(false);
          }
        },
      }).catch((e) => {
        if (signal?.aborted) return;
        setStreamError(
          e instanceof Error ? e.message : t("errors.loadFailed"),
        );
        setStreaming(false);
      });
    },
    [quizId, t],
  );

  useEffect(() => {
    if (!deferredQuestionLoad) return;
    const ctrl = new AbortController();
    consumeStream(ctrl.signal);
    return () => ctrl.abort();
  }, [deferredQuestionLoad, consumeStream]);

  const question = questions[currentIndex];
  const isMultiSelect = (question?.correctAnswers.length ?? 0) > 1;
  const denominator = Math.max(expectedQuestionCount, questions.length, 1);
  const progress = ((currentIndex + 1) / denominator) * 100;
  const waitingForCurrent = !question && currentIndex < expectedQuestionCount;
  const isLastOverall = currentIndex >= expectedQuestionCount - 1;

  useEffect(() => {
    if (!question) return;
    autoAdvanceRef.current = false;
    setQuestionTimeLeft(question.timeSeconds ?? DEFAULT_PENDING_TIME_SECONDS);
  }, [question]);

  const handleSubmit = useCallback(async () => {
    setState("submitting");
    const res = await submitQuiz({ quizId, answers: selectedAnswers });
    if (res.error) {
      errorToast(res.message);
      setState("taking");
      return;
    }
    setResult(res);
    setState("results");
  }, [quizId, selectedAnswers]);

  const persistAnswers = useCallback(
    (next: Record<number, number[]>) => {
      const serialized = JSON.stringify(next);
      if (serialized === lastSavedAnswersRef.current) return;
      lastSavedAnswersRef.current = serialized;
      saveQuizProgress({ quizId, answers: next }).catch(() => {
        // best-effort; next save attempt will retry
      });
    },
    [quizId],
  );

  const goToNext = useCallback(() => {
    persistAnswers(selectedAnswers);
    if (currentIndex >= expectedQuestionCount - 1) {
      if (questions.length >= expectedQuestionCount) {
        handleSubmit();
      }
      return;
    }
    setCurrentIndex((i) => i + 1);
  }, [
    currentIndex,
    expectedQuestionCount,
    questions.length,
    handleSubmit,
    persistAnswers,
    selectedAnswers,
  ]);

  useEffect(() => {
    if (state !== "taking") return;
    if (waitingForCurrent) return;
    if (questionTimeLeft <= 0) {
      if (isLastOverall && questions.length < expectedQuestionCount) return;
      if (!autoAdvanceRef.current) {
        autoAdvanceRef.current = true;
        goToNext();
      }
      return;
    }
    const id = setInterval(
      () => setQuestionTimeLeft((t) => Math.max(0, t - 1)),
      1000,
    );
    return () => clearInterval(id);
  }, [
    questionTimeLeft,
    state,
    goToNext,
    waitingForCurrent,
    isLastOverall,
    questions.length,
    expectedQuestionCount,
  ]);

  useEffect(() => {
    if (state !== "taking") return;
    if (streaming) return;
    if (totalTimeLeft <= 0) {
      if (questions.length >= expectedQuestionCount) handleSubmit();
      return;
    }
    const id = setInterval(
      () => setTotalTimeLeft((t) => Math.max(0, t - 1)),
      1000,
    );
    return () => clearInterval(id);
  }, [
    totalTimeLeft,
    state,
    streaming,
    handleSubmit,
    questions.length,
    expectedQuestionCount,
  ]);

  const toggleOption = (optionIndex: number) => {
    setSelectedAnswers((prev) => {
      const current = prev[currentIndex] ?? [];
      if (isMultiSelect) {
        const updated = current.includes(optionIndex)
          ? current.filter((i) => i !== optionIndex)
          : [...current, optionIndex];
        return { ...prev, [currentIndex]: updated };
      }
      return { ...prev, [currentIndex]: [optionIndex] };
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (state === "submitting") {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2Icon className="size-12 animate-spin" />
          <p className="text-muted-foreground">{t("scoring")}</p>
        </div>
      </div>
    );
  }

  if (state === "results" && result) {
    return (
      <div className="flex min-h-svh items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <div className="mx-auto mb-2">
              {result.passed ? (
                <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/15">
                  <TrophyIcon className="size-8 text-emerald-600" />
                </div>
              ) : (
                <div className="flex size-16 items-center justify-center rounded-full bg-destructive/15">
                  <XCircleIcon className="size-8 text-destructive" />
                </div>
              )}
            </div>
            <CardTitle className="text-2xl">
              {result.passed
                ? t("results.passedTitle")
                : t("results.failedTitle")}
            </CardTitle>
            <CardDescription>
              {result.passed
                ? t("results.passedDescription", { skill: skillName })
                : t("results.failedDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-5xl font-bold tabular-nums">
              {result.score}%
            </div>
            <p className="text-sm text-muted-foreground">
              {t("results.correctSummary", {
                correct: Math.round((result.score / 100) * result.total),
                total: result.total,
              })}
            </p>
            <Badge
              variant={result.passed ? "default" : "destructive"}
              className="text-sm"
            >
              {result.passed
                ? t("results.passedBadge")
                : t("results.failedBadge")}
            </Badge>
          </CardContent>
          <CardFooter className="flex justify-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/worker/assessments">{t("results.back")}</Link>
            </Button>
            {!result.passed && (
              <Button onClick={() => router.refresh()}>
                <RotateCcwIcon className="size-4" />
                {t("results.retake")}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  const currentSelected = selectedAnswers[currentIndex] ?? [];
  const questionTimeLow = questionTimeLeft <= 10;
  const totalTimeLow = totalTimeLeft <= 60;

  const topBar = (
    <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="tabular-nums">
            {currentIndex + 1} / {denominator}
          </Badge>
          {isMultiSelect && !waitingForCurrent && (
            <Badge variant="outline" className="text-xs">
              {t("selectAllThatApply")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex items-center gap-1.5 text-sm tabular-nums",
              questionTimeLow && !waitingForCurrent && "text-destructive font-medium",
            )}
          >
            <ClockIcon className="size-3.5" />
            {waitingForCurrent ? t("clockUnknown") : formatTime(questionTimeLeft)}
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground",
              totalTimeLow && "text-destructive font-medium",
            )}
          >
            {t("totalLabel", { time: formatTime(totalTimeLeft) })}
          </div>
        </div>
      </div>
      <Progress value={progress} className="h-1 rounded-none" />
    </div>
  );

  const streamBanner =
    streamError || streaming ? (
      <div className="border-b bg-muted/40 px-4 py-2 text-center text-sm">
        {streamError ? (
          <span className="text-destructive">
            {streamError}{" "}
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => consumeStream()}
            >
              {t("streamRetry")}
            </button>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2Icon className="size-3.5 animate-spin" />
            {t("streamingLabel")}{" "}
            {questions.length > 0 && (
              <span className="tabular-nums">
                ({questions.length}/{expectedQuestionCount})
              </span>
            )}
          </span>
        )}
      </div>
    ) : null;

  if (waitingForCurrent) {
    return (
      <div className="flex min-h-svh flex-col">
        {streamBanner}
        {topBar}
        <div className="flex flex-1 items-start justify-center p-4 pt-8">
          <Card className="w-full max-w-3xl">
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="mt-2 h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-11 w-full rounded-lg" />
              <Skeleton className="h-11 w-full rounded-lg" />
              <Skeleton className="h-11 w-5/6 rounded-lg" />
              <Skeleton className="h-11 w-4/5 rounded-lg" />
            </CardContent>
            <CardFooter className="justify-end">
              <Button disabled>
                <Loader2Icon className="size-4 animate-spin" />
                {t("loadingNextQuestion")}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  if (!question) return null;

  const mustWaitToFinish =
    isLastOverall && questions.length < expectedQuestionCount;

  return (
    <div className="flex min-h-svh flex-col">
      {streamBanner}
      {topBar}
      <div className="flex flex-1 items-start justify-center p-4 pt-8">
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <CardTitle className="text-lg leading-relaxed">
              {question.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {question.options.map((option, idx) => {
              const isSelected = currentSelected.includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleOption(idx)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/40 hover:bg-muted/50",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30",
                    )}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{option}</span>
                  {isSelected && (
                    <CheckCircleIcon className="ml-auto size-4 shrink-0 text-primary" />
                  )}
                </button>
              );
            })}
          </CardContent>
          <CardFooter className="justify-end">
            <Button
              onClick={goToNext}
              disabled={currentSelected.length === 0 || mustWaitToFinish}
            >
              {isLastOverall
                ? mustWaitToFinish
                  ? t("waitingForFinal")
                  : t("submitQuiz")
                : t("nextQuestion")}
              <ArrowRightIcon className="size-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
