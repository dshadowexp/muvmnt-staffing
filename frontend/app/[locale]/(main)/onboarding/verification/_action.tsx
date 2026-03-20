"use server";

import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { FormErrors } from "@/types";
import { redirect } from "next/navigation";

export const verifyDetailsAction = async(
    prevState: FormErrors | undefined,
    formData: FormData
): Promise<FormErrors | undefined> => {
    const { authUser, user } = await getCurrentUser({ allData: true });
    if (!authUser) return { error: "User not authenticated" };
    if (!user) return { error: "User not found" };

    if (!user.is_email_verified) return { error: "Please verify your email address" };
    if (!user.is_phone_verified) return { error: "Please verify your phone number" };

    if (user.role === "worker") {
        redirect("/onboarding/profile");
    } else {
        redirect("/onboarding/details");
    }
}