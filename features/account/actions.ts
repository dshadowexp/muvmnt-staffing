"use server";

import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/services/supabase/server";
import type { ClientProfileValues } from "@/features/account/schemas/client";
import { mergeOptionalEmailDomain } from "@/features/account/lib/normalize-domains";
import { toAddressJson } from "@/features/geo/lib/build-address-location";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ActionResult = { error: false; message: string } | { error: true; message: string };

type OperatorName = { first_name: string | null; last_name: string | null };

async function assertDomainsAvailableForFacility(
  facilityIdToExclude: string | null,
  domains: string[],
): Promise<ActionResult | null> {
  const supabase = await createAdminClient();
  const t = await getTranslations("dashboard.client.account.organization");

  for (const domain of domains) {
    const { data: row } = await supabase
      .from("facilities")
      .select("id")
      .contains("domains", [domain])
      .maybeSingle();

    if (row && row.id !== facilityIdToExclude) {
      return { error: true, message: t("domainsConflict", { domain }) };
    }
  }

  return null;
}

async function upsertFacility(
  data: ClientProfileValues,
  operatorName?: OperatorName,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: true, message: "User not authenticated" };
  if (session.role !== "client") return { error: true, message: "Not authorized" };

  const { userId, facilityId } = session;
  const supabase = await createAdminClient();

  const addressJson = data.address ? toAddressJson(data.address) : null;
  const base = { name: data.name, type: data.type, address: addressJson };

  const { data: selfUser } = await supabase
    .from("users")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  const emailDomain =
    selfUser?.email?.includes("@") === true
      ? selfUser.email.split("@")[1]!.toLowerCase()
      : null;

  const domainsForSave = mergeOptionalEmailDomain(data.domains, emailDomain);

  const conflict = await assertDomainsAvailableForFacility(facilityId ?? null, domainsForSave);
  if (conflict?.error) return conflict;

  // If user already has a facility, update it
  if (facilityId) {
    const { error } = await supabase
      .from("facilities")
      .update({
        ...base,
        domains: domainsForSave,
        updated_at: new Date().toISOString(),
      })
      .eq("id", facilityId);

    if (error) return { error: true, message: error.message };
    return { error: false, message: "Profile updated successfully" };
  }

  // Otherwise create facility + operator row
  const { data: facility, error: facilityError } = await supabase
    .from("facilities")
    .insert({
      ...base,
      domains: domainsForSave,
    })
    .select("id")
    .single();

  if (facilityError || !facility) {
    return { error: true, message: facilityError?.message ?? "Failed to create facility" };
  }

  const { error: operatorError } = await supabase
    .from("operators")
    .insert({
      facility_id: facility.id,
      user_id: userId,
      permission: "owner",
      first_name: operatorName?.first_name ?? null,
      last_name: operatorName?.last_name ?? null,
    });

  if (operatorError) {
    await supabase.from("facilities").delete().eq("id", facility.id);
    return { error: true, message: operatorError.message };
  }

  return { error: false, message: "Profile saved successfully" };
}

// ─── Exported actions ─────────────────────────────────────────────────────────

export async function createFacilityAction(
  data: ClientProfileValues,
  operatorName?: OperatorName,
): Promise<ActionResult> {
  return upsertFacility(data, operatorName);
}

/** Same as createFacilityAction — use on account settings pages. */
export const updateFacilityProfileAction = createFacilityAction;

/** @deprecated Use createFacilityAction */
export const createClientAction = createFacilityAction;
/** @deprecated Use updateFacilityProfileAction */
export const updateClientProfileAction = updateFacilityProfileAction;
