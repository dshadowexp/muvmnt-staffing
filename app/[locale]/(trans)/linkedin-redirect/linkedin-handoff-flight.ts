/**
 * Deduplicates LinkedIn handoff work across React Strict Mode's double-invoked
 * effects: both calls await the same in-flight promise.
 */
let handoffInFlight: Promise<void> | null = null;

export function runLinkedInHandoffOnce(run: () => Promise<void>): Promise<void> {
  handoffInFlight ??= run().finally(() => {
    handoffInFlight = null;
  });
  return handoffInFlight;
}
