-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: embed address as jsonb on facilities and workers
--
-- Replaces the separate `locations` table approach.
-- Each entity owns its own address; no join required.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Clean up any previous `location` column attempt ───────────────────────

alter table facilities drop column if exists location;
alter table workers    drop column if exists location;

-- Also drop the stray self-named column that may have been generated
alter table facilities drop column if exists facilities;

-- ─── 2. Add address column to facilities ──────────────────────────────────────

alter table facilities
  add column if not exists address jsonb;

-- ─── 3. Add address column to workers ────────────────────────────────────────

alter table workers
  add column if not exists address jsonb;

-- ─── 4. Migrate existing locations → entity tables ───────────────────────────

-- Facilities: find the facility for each client user and copy their location
update facilities f
set    address = jsonb_build_object(
         'address',      l.address,
         'lat',          l.lat,
         'lng',          l.lng,
         'addressLine1', l.address_line_1,
         'addressLine2', l.address_line_2,
         'city',         l.city,
         'adminArea',    l.admin_area,
         'postalCode',   l.postal_code,
         'countryCode',  l.country_code,
         'instructions', l.instructions
       )
from   operators o
join   locations l on l.user_id = o.user_id
where  o.facility_id = f.id
  and  l.address is not null;

-- Workers: copy location directly from locations table
update workers w
set    address = jsonb_build_object(
         'address',      l.address,
         'lat',          l.lat,
         'lng',          l.lng,
         'addressLine1', l.address_line_1,
         'addressLine2', l.address_line_2,
         'city',         l.city,
         'adminArea',    l.admin_area,
         'postalCode',   l.postal_code,
         'countryCode',  l.country_code,
         'instructions', l.instructions
       )
from   locations l
where  l.user_id = w.user_id
  and  l.address is not null;

-- ─── 5. Drop the locations table (after verifying migration is clean) ─────────
-- drop table locations;
