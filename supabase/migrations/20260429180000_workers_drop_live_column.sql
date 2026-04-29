-- Source of truth for "matchable / receiving shifts" is workers.stage = 'live'.
UPDATE workers SET stage = 'live' WHERE live IS TRUE AND stage IS DISTINCT FROM 'live';

ALTER TABLE workers DROP COLUMN IF EXISTS live;

DROP INDEX IF EXISTS workers_live_idx;
