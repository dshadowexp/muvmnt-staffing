-- Phase 1: interview uniqueness model update
-- - Workers: one interview per user (screening_id IS NULL)
-- - Candidates: one interview per user per screening (screening_id IS NOT NULL)

-- Drop legacy uniqueness (one per user+subject) if present.
ALTER TABLE public.interviews
  DROP CONSTRAINT IF EXISTS interviews_user_id_subject_key;

-- Enforce one "worker interview" per user (no screening).
CREATE UNIQUE INDEX IF NOT EXISTS interviews_unique_worker_one
  ON public.interviews (user_id)
  WHERE screening_id IS NULL;

-- Enforce one interview per user per screening (candidates).
CREATE UNIQUE INDEX IF NOT EXISTS interviews_unique_per_screening
  ON public.interviews (user_id, screening_id)
  WHERE screening_id IS NOT NULL;

