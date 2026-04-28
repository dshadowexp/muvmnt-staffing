-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: clients → facilities + operators + facility_invites
-- Run this in Supabase SQL editor (or via supabase db push)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Create facilities ─────────────────────────────────────────────────────

create table if not exists facilities (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  type                  text not null default 'organization',
  billing_mode          text not null default 'invoice',
  net_terms_days        integer not null default 30,
  approval_window_hours integer not null default 24,
  stripe_customer_id    text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ─── 2. Create operators ──────────────────────────────────────────────────────

create table if not exists operators (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  permission  text not null default 'member',   -- owner | manager | member | viewer
  invited_by  uuid references users(id) on delete set null,
  created_at  timestamptz not null default now(),

  -- one user belongs to exactly one facility
  constraint operators_user_id_unique unique (user_id)
);

-- ─── 3. Create facility_invites ───────────────────────────────────────────────

create table if not exists facility_invites (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  email       text not null,
  permission  text not null default 'member',
  token       text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by  uuid not null references users(id) on delete cascade,
  expires_at  timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),

  constraint facility_invites_email_facility_unique unique (facility_id, email)
);

-- ─── 4. Migrate existing clients → facilities ─────────────────────────────────

insert into facilities (id, name, type, billing_mode, net_terms_days, approval_window_hours, stripe_customer_id, created_at, updated_at)
select id, name, type, billing_mode, net_terms_days, approval_window_hours, stripe_customer_id, created_at, updated_at
from clients
on conflict (id) do nothing;

-- ─── 5. Migrate existing client owners → operators ───────────────────────────

insert into operators (facility_id, user_id, permission)
select c.id, c.user_id, 'owner'
from clients c
join users u on u.id = c.user_id   -- only migrate rows where user still exists
on conflict (user_id) do nothing;

-- ─── 6. Rename client_id → facility_id on dependent tables ───────────────────

-- screenings
alter table screenings rename column client_id to facility_id;

-- billing_periods
alter table billing_periods rename column client_id to facility_id;

-- shifts
alter table shifts rename column client_id to facility_id;

-- invoices (if present)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'invoices' and column_name = 'client_id'
  ) then
    alter table invoices rename column client_id to facility_id;
  end if;
end $$;

-- staff_requests (if present)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'staff_requests' and column_name = 'client_id'
  ) then
    alter table staff_requests rename column client_id to facility_id;
  end if;
end $$;

-- ─── 7. Drop clients table (run only after verifying migration is clean) ──────
-- drop table clients;

-- ─── 8. Helpful indexes ───────────────────────────────────────────────────────

create index if not exists operators_facility_id_idx on operators(facility_id);
create index if not exists facility_invites_facility_id_idx on facility_invites(facility_id);
create index if not exists facility_invites_token_idx on facility_invites(token);
create index if not exists facility_invites_email_idx on facility_invites(email);
