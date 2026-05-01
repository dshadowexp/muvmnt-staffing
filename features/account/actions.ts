"use server";

import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/supabase/server";
import type { ClientProfileValues } from "@/features/account/schemas/client";
import { mergeOptionalEmailDomain } from "@/features/account/lib/normalize-domains";
import { isFacilityOperatorRole } from "@/features/auth/lib/facility-operator-role";
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
  if (!isFacilityOperatorRole(session.role)) return { error: true, message: "Not authorized" };

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

  const { data: existingOp } = await supabase
    .from("operators")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingOp) {
    const patch: {
      facility_id: string;
      first_name?: string | null;
      last_name?: string | null;
    } = { facility_id: facility.id };
    const fn = operatorName?.first_name?.trim();
    const ln = operatorName?.last_name?.trim();
    if (fn) patch.first_name = fn;
    if (ln) patch.last_name = ln;

    const { error: operatorError } = await supabase
      .from("operators")
      .update(patch)
      .eq("user_id", userId);

    if (operatorError) {
      await supabase.from("facilities").delete().eq("id", facility.id);
      return { error: true, message: operatorError.message };
    }
  } else {
    const { error: operatorError } = await supabase.from("operators").insert({
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

/** Sidebar: current operator's facility display name (session-scoped). */
export async function getOperatorFacilityNameAction(): Promise<{
  name: string | null;
}> {
  const session = await getSession();
  if (!session?.facilityId) return { name: null };

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("facilities")
    .select("name")
    .eq("id", session.facilityId)
    .maybeSingle();

  if (error) return { name: null };
  const name = data?.name?.trim();
  return { name: name || null };
}
