-- Phase 2: worker vs screening is modeled by screening_id; subject is redundant.
-- Deploy application code that no longer references interviews.subject before applying.

ALTER TABLE public.interviews
  DROP COLUMN IF EXISTS subject;
