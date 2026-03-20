"use server";

import { getAddressLocation } from "@/features/geo/dal/queries";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { FormErrors } from "@/types";
import { redirect } from "next/navigation";

export const locationAction = async(
    prevState: FormErrors | undefined,
    formData: FormData
): Promise<FormErrors | undefined> => {
    const { user } = await getCurrentUser({ allData: true });
    if (!user) return { error: "User not found" };
    
    const location = await getAddressLocation();
    if (!location) return { error: "Please set location information" };

    if (user.role === "worker") {
        redirect("/onboarding/authorization");
    } else {
        redirect("/onboarding/billing");
    }
}