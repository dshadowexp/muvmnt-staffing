-- Public demo / sales funnel: captured before Cal.com scheduling modal.
-- Writes use the Supabase service role from server actions only.

CREATE TABLE demo_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  company_name text NOT NULL,
  job_title text NOT NULL,
  company_size text NOT NULL,
  country text NOT NULL,
  product_interest text NOT NULL,
  roles_hiring_band text,
  marketing_consent boolean NOT NULL DEFAULT false,
  cal_booking_uid text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX demo_leads_email_lower_idx ON demo_leads (lower(email));
CREATE INDEX demo_leads_created_at_idx ON demo_leads (created_at DESC);

ALTER TABLE demo_leads ENABLE ROW LEVEL SECURITY;
