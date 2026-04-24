
import { redirect } from "next/navigation";
import { createIdentityVerificationSession } from "./dal/mutations";

export async function startIdentityVerificationAction() {
    const { data, error } = await createIdentityVerificationSession();
    if (error) throw new Error(error)
    if (!data?.url) throw new Error('Failed to create identity verification session');
    redirect(data.url);
}