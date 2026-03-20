"use server";

import { getBillingAccount } from "@/features/billing/dal/queries";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { FormErrors } from "@/types";
import { redirect } from "next/navigation";

export const payrollAction = async(
    prevState: FormErrors | undefined,
    formData: FormData
): Promise<FormErrors | undefined> => {
    const { user } = await getCurrentUser({ allData: true });
    if (!user) return { error: "User not found" };
    
    // const payrollAccount = await getPayrollAccount();
    // if (!billingAccount) return { error: "Please complete billing setup" };

    redirect("/onboarding/review");
}