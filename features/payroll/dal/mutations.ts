"use server";

import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/supabase/server";
import { getStripeServer } from "@/services/stripe/server";
import { calendarPartsFromYyyyMmDd } from "@/lib/formatters";
import { env } from "@/data/env/server";
import { getCurrentUser } from "@/features/users/dal/queries";
import { professionLabelEn } from "@/lib/labels-en";
import { LEGACY_STAFF_DB_ROLE, STAFF_ROLE } from "@/features/auth/types";
import type { Json } from "@/supabase/types/database";

function trimStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Reads `workers.address` JSON (see `toAddressJson` — camelCase) plus legacy snake_case keys.
 */
function stripeAddressFromWorkerAddressJson(raw: Json | null): {
  country: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
} {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      country: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      postal_code: "",
    };
  }
  const j = raw as Record<string, Json | undefined>;
  const line1 =
    trimStr(j.addressLine1) ||
    trimStr(j.address_line_1) ||
    trimStr(j.address);
  const line2 = trimStr(j.addressLine2) || trimStr(j.address_line_2);
  const city = trimStr(j.city);
  const state = trimStr(j.adminArea) || trimStr(j.admin_area);
  const postal_code = trimStr(j.postalCode) || trimStr(j.postal_code);
  const country = (
    trimStr(j.countryCode) || trimStr(j.country_code)
  ).toUpperCase();
  return { country, line1, line2, city, state, postal_code };
}

export async function createConnectedAccountLink() {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthenticated" };
  if (user.role !== STAFF_ROLE && user.role !== LEGACY_STAFF_DB_ROLE) {
    return { error: "Unauthorized" };
  }
  if (!user.is_email_verified || !user.email || !user.phone_number || !user.is_phone_verified) {
    return { error: "UserIncomplete" };
  }

  const supabase = await createAdminClient();
  const [
    { data: payrollRow, error: payrollError },
    { data: workerProfileData, error: workerProfileError },
  ] = await Promise.all([
    supabase.from("payroll_accounts").select("*").eq("user_id", user.id).single(),
    supabase.from("workers").select("*").eq("user_id", user.id).single(),
  ]);

  if (payrollError && payrollError.code !== "PGRST116") {
    return { error: payrollError.message };
  }
  if (workerProfileError && workerProfileError.code !== "PGRST116") {
    return { error: workerProfileError.message };
  }
  if (!workerProfileData) return { error: "Your profile is not completed" };

  let stripeAccountId;
  const dobParts = calendarPartsFromYyyyMmDd(workerProfileData.date_of_birth);
  if (!dobParts) {
    return { error: "Invalid date of birth" };
  }
  if (!payrollRow) {
    const addr = stripeAddressFromWorkerAddressJson(workerProfileData.address);
    const account = await getStripeServer().accounts.create({
      type: "express",
      country: addr.country,
      email: user.email ?? "",
      metadata: { user_id: user.id },
      business_type: "individual",
      capabilities: {
        transfers: { requested: true },
      },
      business_profile: {
        mcc: "7361",
        name: `${workerProfileData.first_name} ${workerProfileData.last_name}`,
        ...(env.NODE_ENV === "production"
          ? { url: env.APP_URL }
          : { url: "https://readykare.com" }),
        product_description: `Healthcare Professional, ${professionLabelEn(workerProfileData.profession)}`,
        support_email: user.email,
      },
      individual: {
        first_name: workerProfileData.first_name,
        last_name: workerProfileData.last_name,
        dob: dobParts,
        gender: workerProfileData.gender,
        email: user.email,
        phone: user.phone_number,
        address: {
          line1: addr.line1,
          line2: addr.line2 || undefined,
          city: addr.city,
          state: addr.state,
          postal_code: addr.postal_code,
          country: addr.country,
        },
        relationship: {
          title: "Healthcare Professional",
        },
      },
    });

    await supabase.from('payroll_accounts').insert({
      user_id: user.id,
      stripe_account_id: account.id,
    });

    stripeAccountId = account.id;
  } else {
    stripeAccountId = payrollRow.stripe_account_id;
  }
  
  const link = await getStripeServer().accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${env.APP_URL}/onboarding/payroll`,
    return_url: `${env.APP_URL}/onboarding/payroll`,
    type: 'account_onboarding',
    collect: 'eventually_due',
  });

  return { data: { onboardingUrl: link.url } };
}

export async function createPayrollBalancesAccountSession(): Promise<
  { ok: true; clientSecret: string } | { ok: false; message: string }
> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Unauthenticated" };
  const sessionRole = session.role as string;
  if (sessionRole !== STAFF_ROLE && sessionRole !== LEGACY_STAFF_DB_ROLE) {
    return { ok: false, message: "Only staff can view payroll balance." };
  }

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("payroll_accounts")
    .select("stripe_account_id")
    .eq("user_id", session.userId)
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!data?.stripe_account_id) {
    return {
      ok: false,
      message: "Complete payroll setup before viewing your balance.",
    };
  }

  try {
    const accountSession = await getStripeServer().accountSessions.create({
      account: data.stripe_account_id,
      components: {
        balances: {
          enabled: true,
          features: {
            // instant_payouts: true,
            standard_payouts: true,
            external_account_collection: true,
          },
        },
      },
    });

    if (!accountSession.client_secret) {
      return { ok: false, message: "Stripe did not return a client secret." };
    }

    return { ok: true, clientSecret: accountSession.client_secret };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to start Stripe session.";
    return { ok: false, message };
  }
}