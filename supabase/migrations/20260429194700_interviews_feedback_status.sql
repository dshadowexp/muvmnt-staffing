-- Add interview feedback status tracking
-- States:
--   pending     — completed but feedback not generated yet
--   generating  — generation in progress
--   ready       — feedback persisted successfully
--   failed      — generation or persistence failed

ALTER TABLE public.interviews
ADD COLUMN IF NOT EXISTS feedback_status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.interviews
DROP CONSTRAINT IF EXISTS interviews_feedback_status_check;

ALTER TABLE public.interviews
ADD CONSTRAINT interviews_feedback_status_check
CHECK (feedback_status IN ('pending', 'generating', 'ready', 'failed'));

CREATE INDEX IF NOT EXISTS interviews_feedback_status_idx
ON public.interviews (feedback_status);

