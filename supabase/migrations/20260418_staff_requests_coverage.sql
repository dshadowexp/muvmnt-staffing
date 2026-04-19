-- Adds the columns needed by the staff-request wizard redesign.
--
-- coverage_data        cached MatchResult JSON (so /coverage page reload doesn't
--                      always re-run the matching pipeline). Refreshed if older
--                      than 30 minutes.
-- coverage_data_at     timestamp the coverage_data was written.
-- payment_session_id   Stripe Checkout Session id when the client doesn't have
--                      a saved payment method and we route through hosted
--                      checkout instead of an off-session PaymentIntent.

alter table public.staff_requests
  add column if not exists coverage_data       jsonb,
  add column if not exists coverage_data_at    timestamptz,
  add column if not exists payment_session_id  text;

create index if not exists staff_requests_coverage_data_at_idx
  on public.staff_requests (coverage_data_at);
