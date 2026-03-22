"use server";

import { getBillingAccount } from "@/features/billing/dal/queries";
import { updateUserIsActive } from "@/features/users/dal/mutations";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { FormErrors } from "@/types";
import { redirect } from "next/navigation";

export const billingAction = async(
    prevState: FormErrors | undefined,
    formData: FormData
): Promise<FormErrors | undefined> => {
    const { user } = await getCurrentUser({ allData: true });
    if (!user) return { error: "User not found" };
    
    const billingAccount = await getBillingAccount();
    if (!billingAccount) return { error: "Please complete billing setup" };

    await updateUserIsActive(user.id, true);    

    redirect("/app");
}