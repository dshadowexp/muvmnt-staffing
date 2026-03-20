"use server";

import { getCertifications, getWorkAuthorization } from "@/features/profile/dal/queries";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { FormErrors } from "@/types";
import { redirect } from "next/navigation";

export const certificationsAction = async(
    prevState: FormErrors | undefined,
    formData: FormData
): Promise<FormErrors | undefined> => {
    const { user } = await getCurrentUser({ allData: true });
    if (!user) return { error: "User not found" };
    
    const certifications = await getCertifications();
    if (certifications.length === 0) return { error: "Add resume" };

    redirect("/onboarding/payroll");
}