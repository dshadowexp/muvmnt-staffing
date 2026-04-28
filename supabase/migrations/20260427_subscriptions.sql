-- ─── Subscription plan enum ──────────────────────────────────────────────────

create type subscription_plan as enum ('starter', 'pro', 'enterprise');

-- ─── Subscriptions table ──────────────────────────────────────────────────────
-- One active subscription per facility. Stripe drives the lifecycle;
-- we mirror just enough state here for entitlement checks without a live API call.

create table if not exists subscriptions (
    id                  uuid primary key default gen_random_uuid(),
    facility_id         uuid not null references facilities(id) on delete cascade,
    plan                subscription_plan not null,
    stripe_subscription_id  text unique,
    stripe_customer_id      text,
    status              text not null default 'active',   -- active | past_due | canceled | unpaid
    current_period_start    timestamptz,
    current_period_end      timestamptz,
    canceled_at             timestamptz,
    seats_limit         int not null default 3,
    screenings_limit    int not null default 10,
    interviews_limit    int not null default 10,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    unique (facility_id)   -- one subscription row per facility
);

-- Plan-based default limits helper (used in upsert trigger)
-- starter:    3 seats,  10 screenings, 10 interviews
-- pro:        10 seats, 50 screenings, 50 interviews
-- enterprise: unlimited (9999)

create or replace function subscriptions_set_limits()
returns trigger language plpgsql as $$
begin
    case new.plan
        when 'starter' then
            new.seats_limit        := 3;
            new.screenings_limit   := 10;
            new.interviews_limit   := 10;
        when 'pro' then
            new.seats_limit        := 10;
            new.screenings_limit   := 50;
            new.interviews_limit   := 50;
        when 'enterprise' then
            new.seats_limit        := 9999;
            new.screenings_limit   := 9999;
            new.interviews_limit   := 9999;
    end case;
    new.updated_at := now();
    return new;
end;
$$;

create trigger trg_subscriptions_set_limits
before insert or update of plan on subscriptions
for each row execute function subscriptions_set_limits();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table subscriptions enable row level security;

-- Service-role (admin client) bypasses RLS; no public access needed.
-- Add policies here if you want user-visible reads via the anon key.
