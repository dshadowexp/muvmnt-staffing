-- ICS subscription secret on workers (GET /api/calendar/worker/[token]).

-- Remove superseded table if an older draft migration created it.
DROP TABLE IF EXISTS public.worker_calendar_feeds CASCADE;

ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS calendar_token text;

COMMENT ON COLUMN public.workers.calendar_token IS 'Opaque secret for worker ICS calendar feed; unique when set.';

CREATE UNIQUE INDEX IF NOT EXISTS workers_calendar_token_key ON public.workers (calendar_token);
