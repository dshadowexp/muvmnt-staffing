"use server";

import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/services/supabase/server";
import { getStripeServer } from "@/services/stripe/server";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { calendarPartsFromYyyyMmDd } from "@/lib/formatters";
import { env } from "@/data/env/server";

export async function createConnectedAccountLink() {
    const { user, authUser } = await getCurrentUser({ allData: true });
    if (!user) return { error: "Unauthenticated" };
    if (user.role !== 'worker') return { error: "Unauthorized" };

    const supabase = await createAdminClient();

    const [
        { data: payrollRow, error: payrollError },
        { data: workerProfileData, error: workerProfileError },
        { data: locationData, error: locationError },
    ] = await Promise.all([
        supabase.from("payroll_accounts").select("*").eq("user_id", user.id).single(),
        supabase.from("workers").select("*").eq("user_id", user.id).single(),
        supabase.from("locations").select("*").eq("user_id", user.id).single(),
    ]);

    if (payrollError && payrollError.code !== "PGRST116") {
        return { error: payrollError.message };
    }
    if (workerProfileError && workerProfileError.code !== "PGRST116") {
        return { error: workerProfileError.message };
    }
    if (locationError && locationError.code !== "PGRST116") {
        return { error: locationError.message };
    }
    if (!workerProfileData) return { error: "Your profile is not completed" };
    if (!locationData) return { error: "Your location is not completed" };

    let stripeAccountId;
    if (!payrollRow) {
        const account = await getStripeServer().accounts.create({
            type: 'express',
            country: locationData.country_code?.trim().toUpperCase(),
            email: user.email ?? authUser?.email ?? "",
            metadata: { user_id: user.id },
            business_type: 'individual',
            capabilities: {
                transfers: { requested: true },
            },
            business_profile: {
                mcc: '7361',
                name: `${workerProfileData.first_name} ${workerProfileData.last_name}`,
                product_description: 'Temporary staffing agency',
                support_email: user.email ?? "",
            },
            tos_acceptance: {
                service_agreement: 'recipient',
            }
        });

        await supabase.from('payroll_accounts').insert({
            user_id: user.id,
            stripe_account_id: account.id,
        });

        stripeAccountId = account.id;

        const dobParts = calendarPartsFromYyyyMmDd(workerProfileData.date_of_birth);
        if (!dobParts) {
            return { error: "Invalid date of birth" };
        }

        await getStripeServer().accounts.createPerson(stripeAccountId, {
            first_name: workerProfileData.first_name,
            last_name: workerProfileData.last_name,
            dob: dobParts,
            email: user.email ?? authUser?.email ?? "",
            phone: user.phone_number ?? authUser?.phoneNumber ?? "",
            address: {
                line1: locationData.address_line_1?.trim() ?? "",
                line2: locationData.address_line_2?.trim() ?? "",
                city: locationData.city?.trim() ?? "",
                state: locationData.admin_area?.trim() ?? "",
                postal_code: locationData.postal_code?.trim() ?? "",
                country: locationData.country_code?.trim().toUpperCase(),
            },
            relationship: {
                representative: true,
            }
        });
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
  if (session.role !== "worker") {
    return { ok: false, message: "Only workers can view payroll balance." };
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
            instant_payouts: true,
            standard_payouts: true,
            edit_payout_schedule: true,
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