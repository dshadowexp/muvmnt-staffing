"use client";
 
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { toast } from "sonner";
import { Answer, Question, QuizState } from "../types";
import { QuestionSchema } from "@/services/ai/quizes/schema";
import { appendAnswer, appendGeneratedQuestions, createQuizAttempt, finalizeQuiz, syncQuizDuration } from "../actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, CheckCircle2, ChevronRight, CircleDashed, Clock, RotateCcw, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { calcScore, diffBadge, formatTime } from "../helper";

/** What the user was doing when an error was set — drives the retry handler. */
type ErrorContext = "start" | "stream" | "finalize";

// ─── Constants ────────────────────────────────────────────────────────────────
 
const TOTAL_SECONDS    = 15 * 60;
const MAX_BATCHES      = 5;
const TOTAL_QUESTIONS  = MAX_BATCHES * 2;
const PASS_THRESHOLD   = 75;
const DURATION_SYNC_MS = 10_000;

interface QuizPageProps {
    userId:           string;
    skillId:          string;
    skillName:        string;
    skillDescription: string;
    // initialQuestions: Question[];
    // initialAnswers: Answer[];
}

export function QuizClientPage({
    userId,
    skillId,
    skillName,
    skillDescription,
}: QuizPageProps) {
    // ── Core quiz state ─────────────────────────────────────────────────────────
   
    const [state,           setState]           = useState<QuizState>("idle");
    const [questions,       setQuestions]       = useState<Question[]>([]);
    const [currentIndex,    setCurrentIndex]    = useState(0);
    const [answers,         setAnswers]         = useState<Answer[]>([]);
    const [selectedIds,     setSelectedIds]     = useState<Set<string>>(new Set());
    const [batchIndex,      setBatchIndex]      = useState(0);
    const [coveredTopics,   setCoveredTopics]   = useState<string[]>([]);

    // ── Error state ─────────────────────────────────────────────────────────────

    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [errorContext, setErrorContext] = useState<ErrorContext | null>(null);
   
    // ── Timer state ─────────────────────────────────────────────────────────────
   
    const [secondsLeft,    setSecondsLeft]    = useState(TOTAL_SECONDS);
    // CHANGED: elapsedSeconds counts UP so we always know real time spent,
    // independently of the countdown. Used for final duration display + DB sync.
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
   
    // ── Persistence ─────────────────────────────────────────────────────────────
   
    // CHANGED: quizId is created server-side when the quiz starts so every
    // subsequent write (answers, duration, finalize) can reference the same row.
    const [quizId, setQuizId] = useState<string | null>(null);
   
    // ── Refs ────────────────────────────────────────────────────────────────────
   
    const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null);
    const durationSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const finishedRef     = useRef(false);
    // CHANGED: ref mirrors elapsedSeconds so the 10s sync interval always reads
    // the latest value without needing to be recreated every second.
    const elapsedRef      = useRef(0);
   
    // ── Streaming hook ──────────────────────────────────────────────────────────
   
    const { submit, object } = useObject({
      api:    `/api/ai/quizes/${skillId}/questions`,
      schema: QuestionSchema,
      fetch:  async (url) => {
        const formData = new FormData();
        formData.append("skillName",        skillName);
        formData.append("skillDescription", skillDescription);
        formData.append("batchIndex",       String(batchIndex));
        formData.append("previousTopics",   coveredTopics.join(", "));
        return fetch(url, { method: "POST", body: formData });
      },
      onError: (err) => {
        console.error("[quiz] question stream failed:", err);
        setErrorMessage(
          err instanceof Error && err.message
            ? err.message
            : "The assessment engine is unavailable. Please try again.",
        );
        setErrorContext("stream");
        setState("error");
      },
      // CHANGED: onFinish persists generated questions + a generation event log.
      onFinish: async ({ object: result }) => {
        if (!result?.questions) return;
        const newQs = result.questions.filter(Boolean) as Question[];
        setQuestions(prev => [...prev, ...newQs]);
        setCoveredTopics(prev => [...prev, ...newQs.map(q => q.question.slice(0, 60))]);
        setState("answering");
   
        if (quizId) {
          try {
            await appendGeneratedQuestions({ quizId, questions: newQs, batchIndex });
          } catch (err) {
            console.error("[quiz] persist batch failed:", err);
            toast.error("Couldn't save these questions. Your progress will keep going.");
          }
        }
      },
    });
   
    // ── Countdown + elapsed timer ────────────────────────────────────────────────
   
    useEffect(() => {
      if (state !== "answering") return;
   
      timerRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) { finishQuiz(); return 0; }
          return s - 1;
        });
        // CHANGED: increment elapsed ref every second for duration syncing
        elapsedRef.current += 1;
        setElapsedSeconds(e => e + 1);
      }, 1000);
   
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
   
    // CHANGED: separate 10s interval that writes elapsed duration to DB.
    // Keeps the quiz recoverable even if the user's tab crashes mid-attempt.
    useEffect(() => {
      if (!quizId) return;
      if (state !== "answering") return;
   
      // Only warn the user once per session — repeated toasts on a 10s
      // heartbeat would be noisy. Retries happen on the next tick anyway.
      let durationToastShown = false;
      durationSyncRef.current = setInterval(async () => {
        try {
          await syncQuizDuration({ quizId, durationSeconds: elapsedRef.current });
          durationToastShown = false;
        } catch (err) {
          console.error("[quiz] duration sync failed:", err);
          if (!durationToastShown) {
            toast.error("We're having trouble saving your progress. We'll keep retrying.");
            durationToastShown = true;
          }
        }
      }, DURATION_SYNC_MS);
   
      return () => { if (durationSyncRef.current) clearInterval(durationSyncRef.current); };
    }, [quizId, state]);
   
    // ── Start ────────────────────────────────────────────────────────────────────
   
    // CHANGED: creates the DB row first so quizId is available before AI streams.
    // A failure here is fatal — without a quizId every subsequent write no-ops,
    // so we bail out to the error state instead of streaming questions that can
    // never be persisted.
    async function startQuiz() {
      setState("loading");
      setErrorMessage(null);
      setErrorContext(null);
      try {
        const id = await createQuizAttempt({ userId, skillId });
        setQuizId(id);
      } catch (err) {
        console.error("[quiz] create attempt failed:", err);
        setErrorMessage(
          err instanceof Error && err.message
            ? err.message
            : "We couldn't start your assessment. Please try again.",
        );
        setErrorContext("start");
        setState("error");
        return;
      }
      submit({});
    }
   
    // ── Finish ───────────────────────────────────────────────────────────────────
   
    // CHANGED: finalizeQuiz() writes the definitive score, pass/fail,
    // completed_at, and final duration in one atomic DB update.
    const finishQuiz = useCallback(async (latestAnswers?: Answer[]) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      if (timerRef.current)        clearInterval(timerRef.current);
      if (durationSyncRef.current) clearInterval(durationSyncRef.current);
      setState("finished");
   
      const finalAnswers = latestAnswers ?? answers;
      const score        = calcScore(finalAnswers);
   
      if (quizId) {
        try {
          await finalizeQuiz({
            quizId,
            score,
            passed:          score >= PASS_THRESHOLD,
            durationSeconds: elapsedRef.current,
            totalAnswered:   finalAnswers.length,
          });
        } catch (err) {
          // Fatal: the score card we're about to show isn't durable, so flip
          // to the error state instead of presenting a potentially lost result.
          console.error("[quiz] finalize failed:", err);
          setErrorMessage(
            err instanceof Error && err.message
              ? err.message
              : "We couldn't save your score. Please try again.",
          );
          setErrorContext("finalize");
          finishedRef.current = false;
          setState("error");
        }
      }
    }, [answers, quizId]); // eslint-disable-line react-hooks/exhaustive-deps
   
    // ── Toggle option ────────────────────────────────────────────────────────────

    // CHANGED: no longer commits the answer — correctness is hidden until the
    // user finishes the whole quiz. Single-select replaces the selection,
    // multi-select toggles membership. Nothing is persisted here.
    function toggleOption(optionId: string) {
      if (state !== "answering") return;
      const q = questions[currentIndex];
      if (!q) return;

      if (q.type === "single") {
        setSelectedIds(new Set([optionId]));
        return;
      }

      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(optionId)) next.delete(optionId);
        else next.add(optionId);
        return next;
      });
    }

    // ── Commit + advance ─────────────────────────────────────────────────────────

    /** Evaluate the current selection without mutating state. */
    function evaluateCurrent(): Answer | null {
      const q = questions[currentIndex];
      if (!q) return null;
      const picked   = Array.from(selectedIds).sort();
      const expected = [...q.correctIds].sort();
      const correct  =
        picked.length === expected.length &&
        picked.every((id, i) => id === expected[i]);
      return { questionId: q.id, selectedIds: picked, correct };
    }

    // CHANGED: Next is now the single commit point. We evaluate the current
    // selection, append it to answers, fire-and-forget persistence, then
    // either load the next batch or finalize.
    async function nextQuestion() {
      if (state !== "answering") return;
      const newAnswer = evaluateCurrent();
      if (!newAnswer || newAnswer.selectedIds.length === 0) return;

      const nextAnswers = [...answers, newAnswer];
      setAnswers(nextAnswers);

      if (quizId) {
        try {
          await appendAnswer({ quizId, answer: newAnswer });
        } catch (err) {
          console.error("[quiz] persist answer failed:", err);
          toast.error("Couldn't save your answer. We'll keep going and retry at the end.");
        }
      }

      const nextIdx = currentIndex + 1;
      const atEndOfBatch = nextIdx >= questions.length;
      const hasMoreBatches = batchIndex + 1 < MAX_BATCHES;

      if (atEndOfBatch && hasMoreBatches) {
        setBatchIndex(b => b + 1);
        setSelectedIds(new Set());
        setCurrentIndex(nextIdx);
        setState("loading");
        submit({});
        return;
      }

      if (atEndOfBatch) {
        finishQuiz(nextAnswers);
        return;
      }

      setCurrentIndex(nextIdx);
      setSelectedIds(new Set());
    }
   
    // ── Reset ────────────────────────────────────────────────────────────────────
   
    function resetQuiz() {
      setQuestions([]); setAnswers([]); setCurrentIndex(0);
      setSelectedIds(new Set());
      setSecondsLeft(TOTAL_SECONDS); setElapsedSeconds(0);
      elapsedRef.current = 0;
      setBatchIndex(0); setCoveredTopics([]);
      setQuizId(null);
      finishedRef.current = false;
      setErrorMessage(null);
      setErrorContext(null);
      setState("idle");
    }

    // ── Retry from error ─────────────────────────────────────────────────────────

    // Dispatches based on what the user was doing when the error surfaced so
    // "Try again" resumes the right step instead of restarting the attempt.
    function retryFromError() {
      setErrorMessage(null);
      if (errorContext === "start" || !quizId) {
        setErrorContext(null);
        startQuiz();
        return;
      }
      if (errorContext === "finalize") {
        setErrorContext(null);
        finishQuiz();
        return;
      }
      setErrorContext(null);
      setState("loading");
      submit({});
    }
   
    // ── Derived ──────────────────────────────────────────────────────────────────
   
    const currentQuestion = questions[currentIndex];
    const progress        = (currentIndex / TOTAL_QUESTIONS) * 100;
    const timeWarning     = secondsLeft < 120;
    const isMulti         = currentQuestion?.type === "multi";
    const hasSelection    = selectedIds.size > 0;
    const score           = calcScore(answers);
    const correctCount    = answers.filter(a => a.correct).length;

    // End-of-quiz review: join answers with their questions + option labels.
    // Built lazily so per-keystroke re-renders during the quiz don't pay for it.
    const summary = useMemo(() => {
      if (state !== "finished") return [];
      const byId = new Map(questions.map(q => [q.id, q]));
      return answers.map((a) => {
        const q = byId.get(a.questionId);
        if (!q) return null;
        const labelOf = (id: string) =>
          q.options.find(o => o.id === id)?.label ?? id;
        return {
          questionId:   q.id,
          question:     q.question,
          explanation:  q.explanation,
          correct:      a.correct,
          pickedLabels: a.selectedIds.map(labelOf),
          correctLabels: q.correctIds.map(labelOf),
        };
      }).filter((x): x is NonNullable<typeof x> => x !== null);
    }, [state, answers, questions]);
   
    // ─────────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────────
   
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-xl">
   
          {/* ── IDLE ── */}
          {state === "idle" && (
            <Card>
              <CardHeader className="pb-3">
                <Badge variant="secondary" className="w-fit mb-2 text-xs">Skill Assessment</Badge>
                <h1 className="text-xl font-semibold">{skillName}</h1>
                <p className="text-sm text-muted-foreground">{skillDescription}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Duration",  value: "15 min" },
                    { label: "Questions", value: `${TOTAL_QUESTIONS}` },
                    { label: "Pass mark", value: `${PASS_THRESHOLD}%` },
                  ].map(item => (
                    <div key={item.label} className="rounded-md border bg-muted/20 p-3 text-center">
                      <p className="text-base font-semibold">{item.value}</p>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>
                <Button className="w-full" size="sm" onClick={startQuiz}>
                  Begin Assessment <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          )}
   
          {/* ── LOADING ── */}
          {state === "loading" && (
            <Card>
              <CardContent className="py-10 flex flex-col items-center gap-4">
                <CircleDashed className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {batchIndex === 0 ? "Generating assessment…" : "Loading next questions…"}
                </p>
                <div className="w-full space-y-2">
                  {object?.questions?.map((q, i) => q?.question && (
                    <div key={i} className="flex items-start gap-2 rounded-md border bg-muted/20 px-3 py-2">
                      <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <p className="text-xs text-muted-foreground">{q.question}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── ERROR ── */}
          {state === "error" && (
            <Card>
              <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
                <XCircle className="h-6 w-6 text-destructive" />
                <p className="text-sm">
                  {errorMessage ?? "Something went wrong. Please try again."}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={retryFromError}>Try again</Button>
                  <Button size="sm" variant="outline" onClick={resetQuiz}>Reset</Button>
                </div>
              </CardContent>
            </Card>
          )}
   
          {/* ── ANSWERING ── */}
          {state === "answering" && currentQuestion && (
            <div className="space-y-3">
   
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">{skillName}</span>
                  <Badge variant={diffBadge[currentQuestion.difficulty]} className="text-xs capitalize">
                    {currentQuestion.difficulty}
                  </Badge>
                </div>
                <div className={cn(
                  "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-mono font-medium tabular-nums",
                  timeWarning && "border-destructive/40 text-destructive"
                )}>
                  <Clock className="h-3 w-3" />
                  {formatTime(secondsLeft)}
                </div>
              </div>
   
              {/* Progress — intentionally no correct/incorrect count while the
                  user is answering; we don't reveal performance mid-quiz. */}
              <div className="space-y-1">
                <Progress value={progress} className="h-1" />
                <div className="flex justify-end text-xs text-muted-foreground">
                  <span>{currentIndex + 1} / {TOTAL_QUESTIONS}</span>
                </div>
              </div>
   
              {/* Question */}
              <Card>
                <CardContent className="pt-5 space-y-4">
                  {isMulti && (
                    <Badge variant="outline" className="text-xs">Select all that apply</Badge>
                  )}
   
                  <p className="text-sm font-medium leading-relaxed">
                    {currentQuestion.question}
                  </p>
   
                  <div className="space-y-1.5">
                    {currentQuestion.options.map((opt) => {
                      const isSelected = selectedIds.has(opt.id);

                      return (
                        <button
                          key={opt.id}
                          onClick={() => toggleOption(opt.id)}
                          className={cn(
                            "w-full flex items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
                            "hover:bg-muted/50",
                            isSelected && "border-primary/40 bg-primary/5",
                          )}
                        >
                          {isMulti ? (
                            <span className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[9px] font-bold",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border"
                            )}>
                              {isSelected && "✓"}
                            </span>
                          ) : (
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-semibold text-muted-foreground">
                              {opt.id.toUpperCase()}
                            </span>
                          )}
                          <span className="flex-1">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    size="sm"
                    className="w-full"
                    onClick={nextQuestion}
                    disabled={!hasSelection}
                  >
                    {currentIndex + 1 >= TOTAL_QUESTIONS ? "Finish" : "Next"}
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
   
          {/* ── FINISHED ── */}
          {state === "finished" && (
            <div className="space-y-3">
              <Card>
                <CardContent className="pt-8 pb-6 space-y-5 text-center">
                  {score >= PASS_THRESHOLD
                    ? <CheckCircle2 className="h-10 w-10 mx-auto text-green-500" />
                    : <XCircle className="h-10 w-10 mx-auto text-destructive" />
                  }
                  <div>
                    <p className="text-4xl font-bold tabular-nums">{score}%</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {score >= PASS_THRESHOLD ? "Passed" : "Not passed"} · {PASS_THRESHOLD}% required
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Correct",   value: correctCount },
                      { label: "Incorrect", value: answers.length - correctCount },
                      { label: "Time",      value: formatTime(elapsedSeconds) },
                    ].map(item => (
                      <div key={item.label} className="rounded-md border bg-muted/20 p-3">
                        <p className="text-base font-semibold tabular-nums">{item.value}</p>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    {score >= PASS_THRESHOLD && (
                      <Button size="sm" className="w-full gap-2">
                        <Award className="h-4 w-4" /> Claim Certificate
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="w-full gap-2" onClick={resetQuiz}>
                      <RotateCcw className="h-4 w-4" /> Retake
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {summary.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <h2 className="text-sm font-semibold">Review</h2>
                    <p className="text-xs text-muted-foreground">
                      See where you were right and what to revisit.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {summary.map((item, i) => (
                      <div
                        key={item.questionId}
                        className={cn(
                          "rounded-md border p-3 space-y-2",
                          item.correct
                            ? "border-green-500/30 bg-green-500/5"
                            : "border-destructive/30 bg-destructive/5",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {item.correct
                            ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
                            : <XCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                          }
                          <p className="text-sm font-medium leading-relaxed">
                            {i + 1}. {item.question}
                          </p>
                        </div>
                        <div className="pl-6 space-y-1 text-xs">
                          <p>
                            <span className="text-muted-foreground">Your answer: </span>
                            <span className={cn(
                              "font-medium",
                              item.correct ? "text-green-700 dark:text-green-400" : "text-destructive",
                            )}>
                              {item.pickedLabels.length > 0
                                ? item.pickedLabels.join(", ")
                                : "—"}
                            </span>
                          </p>
                          {!item.correct && (
                            <p>
                              <span className="text-muted-foreground">Correct answer: </span>
                              <span className="font-medium text-green-700 dark:text-green-400">
                                {item.correctLabels.join(", ")}
                              </span>
                            </p>
                          )}
                          {item.explanation && (
                            <p className="text-muted-foreground leading-relaxed pt-1">
                              💡 {item.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
   
        </div>
      </div>
    );
  }
   