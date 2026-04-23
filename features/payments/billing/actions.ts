"use server";

import { redirect } from "next/navigation";
import { createPortalSession } from "./dal/mutations";

/** Opens Stripe Customer Portal (payment method flow) — used from client onboarding like worker payroll setup. */
export async function setupBillingPortalAction() {
    const res = await createPortalSession();
    if (res.error) throw new Error(res.error);
    if (!res.data?.url) throw new Error("Failed to create billing portal session");
    redirect(res.data.url);
}
