import { getClientProfile } from "@/features/profile/dal/queries";
import { OrganizationClient } from "./_client";

export default async function OrganizationPage() {
    const clientProfile = await getClientProfile();

    return (
        <>
            <OrganizationClient clientProfile={clientProfile ?? null} />
        </>
    )
}