"use server";

import { getWorkAuthorization, getWorkerProfile } from "@/features/profile/dal/queries";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { FormErrors } from "@/types";
import { redirect } from "next/navigation";

export const authorizationAction = async(
    prevState: FormErrors | undefined,
    formData: FormData
): Promise<FormErrors | undefined> => {
    const { user } = await getCurrentUser({ allData: true });
    if (!user) return { error: "User not found" };

    const profile = await getWorkerProfile();
    if (!profile) return { error: "Please set your profile" };
    if (profile.photo_url === null) return { error: "Please set your photo" };
    
    const workAuthorization = await getWorkAuthorization();
    if (!workAuthorization) return { error: "Please set work authorization" };

    redirect("/onboarding/certifications");
}