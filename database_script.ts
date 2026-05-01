/**
 * Sync `locations` → `workers.address` (JSON shape aligned with toAddressJson).
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SECRET_KEY=... npx tsx scripts/sync-locations-to-workers-address.ts
 *   DRY_RUN=1 npx tsx scripts/sync-locations-to-workers-address.ts
 *
 * Optional: load .env.local with dotenv/config at top if you use it locally.
 */

import type { Database } from "@/supabase/types/database";
import { LEGACY_STAFF_DB_ROLE, STAFF_ROLE } from "@/features/auth/types";
import { createServerClient } from '@supabase/ssr'
import { latLngToCell } from "h3-js";
import { parse, config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

  console.log(url, secret);

  if (!url || !secret) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
    process.exit(1);
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
      },
    }
  )

  // Only users who have a worker profile (safest definition of "worker user")
  const { data: workerRows, error: wErr } = await supabase
    .from("workers")
    .select("user_id");
  if (wErr) {
    console.error(wErr.message);
    process.exit(1);
  }
  const userIds = [...new Set((workerRows ?? []).map((w) => w.user_id))];
  if (userIds.length === 0) {
    console.log("No workers found.");
    return;
  }
  const { data: users, error: uErr } = await supabase
    .from("users")
    .select("id, email, role")
    .in("id", userIds);
  if (uErr) {
    console.error(uErr.message);
    process.exit(1);
  }
  const toUpdate = (users ?? []).filter((u) => u.role === LEGACY_STAFF_DB_ROLE);
  console.log(
    `Users with workers row: ${userIds.length}; still role=${LEGACY_STAFF_DB_ROLE}: ${toUpdate.length}`,
  );
  if (dryRun) {
    console.log("DRY_RUN — would update:", toUpdate.map((u) => u.id));
    return;
  }
  for (const u of toUpdate) {
    const { error } = await supabase
      .from("users")
      .update({ role: STAFF_ROLE, updated_at: new Date().toISOString() })
      .eq("id", u.id)
      .eq("role", LEGACY_STAFF_DB_ROLE);
    if (error) {
      console.error(`Failed ${u.id}:`, error.message);
    }
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});