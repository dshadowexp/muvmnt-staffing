import type { QuizQuestion } from "@/services/ai/quizes";

export type QuizStreamEvent =
  | { type: "ready"; questions: QuizQuestion[]; target: number }
  | { type: "batch"; questions: QuizQuestion[] }
  | { type: "done" }
  | { type: "error"; message: string };

/**
 * Reads newline-delimited JSON events from the quiz streaming endpoint, invoking
 * `onEvent` for each parsed message. Aborts cleanly when `signal` fires.
 */
export async function streamQuizQuestions({
  quizId,
  signal,
  onEvent,
}: {
  quizId: string;
  signal?: AbortSignal;
  onEvent: (event: QuizStreamEvent) => void;
}): Promise<void> {
  const res = await fetch(`/api/ai/quizes/${quizId}/stream`, {
    method: "POST",
    signal,
    headers: { Accept: "application/x-ndjson" },
  });

  if (!res.ok || !res.body) {
    let message = `Stream request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // ignore
    }
    onEvent({ type: "error", message });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);
        if (!line) continue;
        try {
          onEvent(JSON.parse(line) as QuizStreamEvent);
        } catch {
          // Malformed line, ignore and continue.
        }
      }
    }

    const tail = buffer.trim();
    if (tail) {
      try {
        onEvent(JSON.parse(tail) as QuizStreamEvent);
      } catch {
        // ignore trailing partial
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }
}
