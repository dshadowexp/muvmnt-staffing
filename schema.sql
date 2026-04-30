-- =============================================================================
-- ReadyKare Test Database Schema
-- Inferred from services/supabase/types/database.ts
-- Includes CHECK constraints and indexes where appropriate.
-- NOTE: CHECK constraint values for "status" columns are best-guess from
--       context — verify against your production data before using.
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
-- TABLE: users
-- Root table — every other user-linked table references this.
-- =============================================================================
CREATE TABLE users (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id             text        NOT NULL,
  email               text,
  phone_number        text,
  push_token          text,
  role                text        CHECK (role IN ('admin', 'worker', 'client')),
  is_active           boolean     NOT NULL DEFAULT true,
  is_email_verified   boolean     NOT NULL DEFAULT false,
  is_phone_verified   boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz
);

CREATE UNIQUE INDEX users_auth_id_idx ON users (auth_id);
CREATE INDEX        users_email_idx   ON users (email);
CREATE INDEX        users_role_idx    ON users (role);


-- =============================================================================
-- TABLE: clients
-- One client profile per user (isOneToOne).
-- =============================================================================
CREATE TABLE clients (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name                    text        NOT NULL,
  type                    text        NOT NULL,
  billing_mode            text        NOT NULL DEFAULT 'manual',
  net_terms_days          integer     NOT NULL DEFAULT 30,
  approval_window_hours   integer     NOT NULL DEFAULT 24,
  stripe_customer_id      text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX clients_user_id_idx         ON clients (user_id);
CREATE INDEX        clients_type_idx            ON clients (type);
CREATE INDEX        clients_stripe_customer_idx ON clients (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;


-- =============================================================================
-- TABLE: workers
-- Worker profile — has its own PK (id) in addition to user_id FK.
-- =============================================================================
CREATE TABLE workers (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  first_name            text        NOT NULL,
  last_name             text        NOT NULL,
  date_of_birth         date        NOT NULL,
  gender                text        NOT NULL DEFAULT '',
  profession            text        NOT NULL,
  years_exp             integer     NOT NULL DEFAULT 0,
  photo_url             text,
  stage                 text        NOT NULL DEFAULT 'interview'
                          CHECK (stage IN ('interview', 'compliance', 'payroll', 'availability', 'live')),
  auto_confirm          boolean     NOT NULL DEFAULT false,
  cell_id               text,
  availability_timezone text,
  rating_avg            numeric(3, 2),
  rating_count          integer,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX workers_user_id_idx    ON workers (user_id);
CREATE INDEX        workers_stage_idx      ON workers (stage);
CREATE INDEX        workers_profession_idx ON workers (profession);
CREATE INDEX        workers_cell_id_idx    ON workers (cell_id) WHERE cell_id IS NOT NULL;


-- =============================================================================
-- TABLE: skills
-- Skills associated with a worker.
-- =============================================================================
CREATE TABLE skills (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name       text        NOT NULL,
  assessed   boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX skills_user_id_idx  ON skills (user_id);
CREATE INDEX skills_assessed_idx ON skills (user_id, assessed);


-- =============================================================================
-- TABLE: availability
-- Weekly recurring availability slots per worker.
-- =============================================================================
CREATE TABLE availability (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  day_of_week integer     NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time  time        NOT NULL,
  end_time    time        NOT NULL,
  created_at  timestamptz
);

CREATE INDEX availability_user_id_idx ON availability (user_id);


-- =============================================================================
-- TABLE: billing_accounts
-- Stripe customer billing account — one per user (isOneToOne).
-- =============================================================================
CREATE TABLE billing_accounts (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  stripe_customer_id text        NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz
);

CREATE UNIQUE INDEX billing_accounts_user_id_idx         ON billing_accounts (user_id);
CREATE UNIQUE INDEX billing_accounts_stripe_customer_idx ON billing_accounts (stripe_customer_id);


-- =============================================================================
-- TABLE: payroll_accounts
-- Stripe Connect payout account for workers.
-- =============================================================================
CREATE TABLE payroll_accounts (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  stripe_account_id   text        NOT NULL,
  charges_enabled     boolean     NOT NULL DEFAULT false,
  payouts_enabled     boolean     NOT NULL DEFAULT false,
  details_submitted   boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX payroll_accounts_user_id_idx        ON payroll_accounts (user_id);
CREATE UNIQUE INDEX payroll_accounts_stripe_account_idx ON payroll_accounts (stripe_account_id);


-- =============================================================================
-- TABLE: locations
-- Physical location per user (isOneToOne).
-- =============================================================================
CREATE TABLE locations (
  id              uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid           NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  address         text           NOT NULL,
  address_line_1  text,
  address_line_2  text,
  city            text,
  admin_area      text,
  postal_code     text,
  country_code    text,
  lat             numeric(10, 7) NOT NULL,
  lng             numeric(10, 7) NOT NULL,
  instructions    text,
  created_at      timestamptz    NOT NULL DEFAULT now(),
  updated_at      timestamptz
);

CREATE UNIQUE INDEX locations_user_id_idx ON locations (user_id);


-- =============================================================================
-- TABLE: onboarding
-- Onboarding state/steps per user.
-- =============================================================================
CREATE TABLE onboarding (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  steps        jsonb       NOT NULL DEFAULT '{}',
  is_completed boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX onboarding_user_id_idx ON onboarding (user_id);


-- =============================================================================
-- TABLE: compliances
-- Compliance document uploads per worker.
-- (FK in production is named "certifications_user_id_fkey")
-- =============================================================================
CREATE TABLE compliances (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name        text        NOT NULL,
  file_url    text,
  is_verified boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX compliances_user_id_idx  ON compliances (user_id);
CREATE INDEX compliances_verified_idx ON compliances (user_id, is_verified);


-- =============================================================================
-- TABLE: work_authorizations
-- Work authorization documents per worker.
-- =============================================================================
CREATE TABLE work_authorizations (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type                 text        NOT NULL,
  file_url             text,
  social_number        text,
  social_number_expiry date,
  is_verified          boolean     NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX work_authorizations_user_id_idx ON work_authorizations (user_id);


-- =============================================================================
-- TABLE: identity_verification
-- KYC/identity session per user (isOneToOne).
-- =============================================================================
CREATE TABLE identity_verification (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  session_id  text        NOT NULL,
  verified    boolean     NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX identity_verification_user_id_idx    ON identity_verification (user_id);
CREATE INDEX        identity_verification_session_id_idx ON identity_verification (session_id);


-- =============================================================================
-- TABLE: feedbacks
-- In-app feedback submissions from any role.
-- =============================================================================
CREATE TABLE feedbacks (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role           text        NOT NULL CHECK (role IN ('admin', 'worker', 'client')),
  category       text        NOT NULL,
  message        text        NOT NULL,
  rating         integer     CHECK (rating >= 1 AND rating <= 5),
  screenshot_key text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX feedbacks_user_id_idx  ON feedbacks (user_id);
CREATE INDEX feedbacks_category_idx ON feedbacks (category);


-- =============================================================================
-- TABLE: demo_leads
-- Landing “request a demo” funnel; paired with Cal.com booking UID when embed confirms.
-- =============================================================================
CREATE TABLE demo_leads (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email                text        NOT NULL,
  first_name           text        NOT NULL,
  last_name            text        NOT NULL,
  company_name         text        NOT NULL,
  job_title            text        NOT NULL,
  company_size         text        NOT NULL,
  country              text        NOT NULL,
  product_interest     text        NOT NULL,
  roles_hiring_band    text,
  marketing_consent    boolean     NOT NULL DEFAULT false,
  cal_booking_uid      text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX demo_leads_email_lower_idx ON demo_leads (lower(email));
CREATE INDEX demo_leads_created_at_idx  ON demo_leads (created_at DESC);

ALTER TABLE demo_leads ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- TABLE: referral_codes
-- Unique invite codes issued per user.
-- =============================================================================
CREATE TABLE referral_codes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  code       text        NOT NULL,
  role       text        NOT NULL CHECK (role IN ('admin', 'worker', 'client')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX referral_codes_code_idx    ON referral_codes (code);
CREATE INDEX        referral_codes_user_id_idx ON referral_codes (user_id);


-- =============================================================================
-- TABLE: referrals
-- Tracks who referred whom and reward state.
-- (No FKs defined in types but logically link to users)
-- =============================================================================
CREATE TABLE referrals (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id   uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  referred_id   uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  referrer_role text        NOT NULL CHECK (referrer_role IN ('admin', 'worker', 'client')),
  status        text        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'completed', 'cancelled')),
  reward_cents  integer,
  free_hours    numeric,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX referrals_referrer_id_idx ON referrals (referrer_id);
CREATE INDEX referrals_referred_id_idx ON referrals (referred_id);
CREATE INDEX referrals_status_idx      ON referrals (status);


-- =============================================================================
-- TABLE: screenings
-- Screening campaigns created by clients.
-- =============================================================================
CREATE TABLE screenings (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          uuid        NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  title              text        NOT NULL,
  description        text        NOT NULL,
  status             text        NOT NULL
                       CHECK (status IN ('draft', 'active', 'closed', 'archived')),
  allowed_languages  text[]      NOT NULL DEFAULT '{}',
  deadline_days      integer     NOT NULL DEFAULT 7,
  interview_duration integer     NOT NULL DEFAULT 30,
  require_identity   boolean     NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX screenings_client_id_idx ON screenings (client_id);
CREATE INDEX screenings_status_idx    ON screenings (status);


-- =============================================================================
-- TABLE: screening_invites
-- Email invitations sent out per screening.
-- =============================================================================
CREATE TABLE screening_invites (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id uuid        NOT NULL REFERENCES screenings (id) ON DELETE CASCADE,
  email        text        NOT NULL,
  token        text        NOT NULL DEFAULT gen_random_uuid()::text,
  status       text        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'sent', 'accepted', 'declined', 'expired', 'revoked')),
  sent_at      timestamptz,
  revoked_at   timestamptz,
  revoked_by   uuid        REFERENCES users (id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX screening_invites_token_idx        ON screening_invites (token);
CREATE INDEX        screening_invites_screening_id_idx ON screening_invites (screening_id);
CREATE INDEX        screening_invites_status_idx       ON screening_invites (status);


-- =============================================================================
-- TABLE: screening_candidates
-- Candidates who have started or completed a screening.
-- =============================================================================
CREATE TABLE screening_candidates (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id          uuid        NOT NULL REFERENCES screenings (id) ON DELETE CASCADE,
  invite_id             uuid        REFERENCES screening_invites (id) ON DELETE SET NULL,
  user_id               uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  email                 text        NOT NULL,
  first_name            text,
  last_name             text,
  photo_url             text,
  stage                 text        NOT NULL DEFAULT 'invited'
                          CHECK (stage IN ('invited', 'started', 'completed', 'withdrawn')),
  identity_verification jsonb       NOT NULL DEFAULT '{}',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX screening_candidates_screening_id_idx ON screening_candidates (screening_id);
CREATE INDEX screening_candidates_user_id_idx      ON screening_candidates (user_id);
CREATE INDEX screening_candidates_stage_idx        ON screening_candidates (screening_id, stage);


-- =============================================================================
-- TABLE: billing_periods
-- Invoice billing windows for a client.
-- =============================================================================
CREATE TABLE billing_periods (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid        NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end   timestamptz NOT NULL,
  status       text        NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'closed', 'pending')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX billing_periods_client_id_idx ON billing_periods (client_id);
CREATE INDEX billing_periods_status_idx    ON billing_periods (client_id, status);


-- =============================================================================
-- TABLE: staff_requests
-- Shift requests placed by clients.
-- =============================================================================
CREATE TABLE staff_requests (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  cell_id            text        NOT NULL,
  profession         text        NOT NULL,
  positions          integer     NOT NULL DEFAULT 1,
  start_date         date        NOT NULL,
  end_date           date,
  daily_time_windows jsonb       NOT NULL DEFAULT '[]',
  requirements       text[]      NOT NULL DEFAULT '{}',
  tasks              text[]      NOT NULL DEFAULT '{}',
  location           jsonb       NOT NULL DEFAULT '{}',
  notes              text,
  status             text        NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'active', 'filled', 'cancelled', 'completed')),
  pricing_tier       text,
  pricing_rate       numeric,
  charge_frequency   text,
  invoice_id         text,
  payment_session_id text,
  coverage_data      jsonb,
  coverage_data_at   timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  update_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX staff_requests_client_user_id_idx ON staff_requests (client_user_id);
CREATE INDEX staff_requests_status_idx         ON staff_requests (status);
CREATE INDEX staff_requests_start_date_idx     ON staff_requests (start_date);
CREATE INDEX staff_requests_cell_id_idx        ON staff_requests (cell_id);


-- =============================================================================
-- TABLE: interviews
-- AI video interviews taken by workers.
-- =============================================================================
CREATE TABLE interviews (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  screening_id          uuid        REFERENCES screenings (id) ON DELETE SET NULL,
  subject_ref           jsonb,
  hume_chat_id          text,
  chat_group_id         text,
  language              text,
  duration              text,
  recording_url         text,
  feedback              jsonb,
  feedback_status       text        NOT NULL DEFAULT 'pending'
                          CHECK (feedback_status IN ('pending', 'generating', 'ready', 'failed')),
  survey                jsonb,
  result                text        CHECK (result IN ('pass', 'fail')),
  reviewed              boolean     NOT NULL DEFAULT false,
  video_feedback        jsonb,
  video_feedback_status text        CHECK (video_feedback_status IN ('pending', 'processing', 'completed', 'failed')),
  completed_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX interviews_user_id_idx      ON interviews (user_id);
CREATE INDEX interviews_screening_id_idx ON interviews (screening_id) WHERE screening_id IS NOT NULL;
CREATE INDEX interviews_completed_at_idx ON interviews (completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX interviews_reviewed_idx     ON interviews (reviewed);
CREATE INDEX interviews_result_idx       ON interviews (result) WHERE result IS NOT NULL;
CREATE INDEX interviews_feedback_status_idx ON interviews (feedback_status);


-- =============================================================================
-- TABLE: quizzes
-- Skill assessment quizzes per worker.
-- =============================================================================
CREATE TABLE quizzes (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  skill_id         uuid        NOT NULL REFERENCES skills (id) ON DELETE CASCADE,
  questions        jsonb       NOT NULL DEFAULT '[]',
  answers          jsonb,
  generation       jsonb,
  total_questions  integer     NOT NULL,
  duration_seconds integer     NOT NULL DEFAULT 0,
  pass_threshold   numeric     NOT NULL DEFAULT 0.7,
  score            numeric,
  passed           boolean,
  completed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX quizzes_user_id_idx  ON quizzes (user_id);
CREATE INDEX quizzes_skill_id_idx ON quizzes (skill_id);
CREATE INDEX quizzes_passed_idx   ON quizzes (user_id, passed) WHERE passed IS NOT NULL;


-- =============================================================================
-- TABLE: invoices
-- Stripe invoices linked to a billing period.
-- =============================================================================
CREATE TABLE invoices (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           uuid        NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  billing_period_id   uuid        NOT NULL REFERENCES billing_periods (id) ON DELETE CASCADE,
  stripe_invoice_id   text        NOT NULL,
  stripe_customer_id  text        NOT NULL,
  status              text        NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  collection_method   text        NOT NULL,
  total_amount_cents  integer     NOT NULL DEFAULT 0,
  currency            text        NOT NULL DEFAULT 'usd',
  period_start        timestamptz NOT NULL,
  period_end          timestamptz NOT NULL,
  due_date            timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX invoices_stripe_invoice_id_idx ON invoices (stripe_invoice_id);
CREATE INDEX        invoices_client_id_idx         ON invoices (client_id);
CREATE INDEX        invoices_billing_period_id_idx ON invoices (billing_period_id);
CREATE INDEX        invoices_status_idx            ON invoices (status);


-- =============================================================================
-- TABLE: payments
-- Payment records linked to staff requests.
-- =============================================================================
CREATE TABLE payments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id        uuid        NOT NULL REFERENCES staff_requests (id) ON DELETE CASCADE,
  stripe_payment_id text        NOT NULL,
  status            text        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  amount_cents      integer,
  currency          text        NOT NULL DEFAULT 'usd',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX payments_stripe_payment_id_idx ON payments (stripe_payment_id);
CREATE INDEX        payments_request_id_idx        ON payments (request_id);
CREATE INDEX        payments_status_idx            ON payments (status);


-- =============================================================================
-- TABLE: shifts
-- Individual shift instances assigned from a staff request.
-- =============================================================================
CREATE TABLE shifts (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id        uuid        NOT NULL REFERENCES staff_requests (id) ON DELETE CASCADE,
  client_id         uuid        NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  worker_id         uuid        REFERENCES workers (id) ON DELETE SET NULL,
  billing_period_id uuid        REFERENCES billing_periods (id) ON DELETE SET NULL,
  start_time        timestamptz NOT NULL,
  end_time          timestamptz NOT NULL,
  hourly_rate       numeric,
  status            text        CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  timesheet_status  text        CHECK (timesheet_status IN ('pending', 'approved', 'disputed')),
  offered_worker_ids uuid[],
  location          jsonb,
  checkin_time      timestamptz,
  checkout_time     timestamptz,
  confirm_time      timestamptz,
  complete_time     timestamptz,
  approved_at       timestamptz,
  approved_by       uuid        REFERENCES users (id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX shifts_request_id_idx        ON shifts (request_id);
CREATE INDEX shifts_client_id_idx         ON shifts (client_id);
CREATE INDEX shifts_worker_id_idx         ON shifts (worker_id) WHERE worker_id IS NOT NULL;
CREATE INDEX shifts_start_time_idx        ON shifts (start_time);
CREATE INDEX shifts_status_idx            ON shifts (status) WHERE status IS NOT NULL;
CREATE INDEX shifts_billing_period_id_idx ON shifts (billing_period_id) WHERE billing_period_id IS NOT NULL;


-- =============================================================================
-- TABLE: shift_ratings
-- Client ratings left for a worker after a shift.
-- =============================================================================
CREATE TABLE shift_ratings (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id       uuid        NOT NULL REFERENCES shifts (id) ON DELETE CASCADE,
  worker_id      uuid        NOT NULL REFERENCES workers (id) ON DELETE CASCADE,
  client_user_id uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  rating         integer     NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment        text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- One rating per shift per worker
CREATE UNIQUE INDEX shift_ratings_shift_worker_idx ON shift_ratings (shift_id, worker_id);
CREATE INDEX        shift_ratings_worker_id_idx    ON shift_ratings (worker_id);


-- =============================================================================
-- TABLE: shift_response_tokens
-- One-time-use tokens for workers to accept/decline a shift via email link.
-- (No FKs in types — added logically)
-- =============================================================================
CREATE TABLE shift_response_tokens (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid        NOT NULL REFERENCES staff_requests (id) ON DELETE CASCADE,
  worker_id  uuid        NOT NULL REFERENCES workers (id) ON DELETE CASCADE,
  token      text        NOT NULL,
  action     text        NOT NULL CHECK (action IN ('accept', 'decline')),
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX shift_response_tokens_token_idx      ON shift_response_tokens (token);
CREATE INDEX        shift_response_tokens_request_id_idx ON shift_response_tokens (request_id);
CREATE INDEX        shift_response_tokens_worker_id_idx  ON shift_response_tokens (worker_id);


-- =============================================================================
-- TABLE: shift_tips
-- Tips paid by a client to a worker for a specific shift.
-- =============================================================================
CREATE TABLE shift_tips (
  id                            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id                      uuid        NOT NULL REFERENCES shifts (id) ON DELETE CASCADE,
  worker_id                     uuid        NOT NULL REFERENCES workers (id) ON DELETE CASCADE,
  client_user_id                uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  stripe_payment_intent_id      text        NOT NULL,
  stripe_destination_account_id text        NOT NULL,
  amount_cents                  integer     NOT NULL,
  currency                      text        NOT NULL DEFAULT 'usd',
  status                        text        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'completed', 'failed')),
  created_at                    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX shift_tips_stripe_payment_intent_idx ON shift_tips (stripe_payment_intent_id);
CREATE INDEX        shift_tips_shift_id_idx              ON shift_tips (shift_id);
CREATE INDEX        shift_tips_worker_id_idx             ON shift_tips (worker_id);


-- =============================================================================
-- TABLE: transfers
-- Stripe payouts to workers for a given shift.
-- =============================================================================
CREATE TABLE transfers (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id           uuid        NOT NULL REFERENCES shifts (id) ON DELETE CASCADE,
  stripe_transfer_id text        NOT NULL,
  amount_cents       integer     NOT NULL,
  currency           text        NOT NULL DEFAULT 'usd',
  status             text        NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'completed', 'failed')),
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX transfers_stripe_transfer_id_idx ON transfers (stripe_transfer_id);
CREATE INDEX        transfers_shift_id_idx           ON transfers (shift_id);
CREATE INDEX        transfers_status_idx             ON transfers (status);


-- =============================================================================
-- FUNCTION: append_quiz_answer
-- Appends a single answer object to a quiz's answers JSONB array.
-- =============================================================================
CREATE OR REPLACE FUNCTION append_quiz_answer(p_quiz_id uuid, p_answer jsonb)
RETURNS void
LANGUAGE sql AS $$
  UPDATE quizzes
  SET
    answers    = COALESCE(answers, '[]'::jsonb) || jsonb_build_array(p_answer),
    updated_at = now()
  WHERE id = p_quiz_id;
$$;


-- =============================================================================
-- FUNCTION: append_quiz_batch
-- Sets generation metadata and appends a batch of questions to a quiz.
-- =============================================================================
CREATE OR REPLACE FUNCTION append_quiz_batch(p_quiz_id uuid, p_generation jsonb, p_questions jsonb)
RETURNS void
LANGUAGE sql AS $$
  UPDATE quizzes
  SET
    generation = p_generation,
    questions  = COALESCE(questions, '[]'::jsonb) || p_questions,
    updated_at = now()
  WHERE id = p_quiz_id;
$$;
