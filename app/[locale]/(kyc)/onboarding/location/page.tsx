import { getAddressLocation } from "@/features/geo/dal/queries";
import { getSession } from "@/lib/session";
import { LocationClient } from "./_client";

export default async function LocationPage() {
    const [location, session] = await Promise.all([
        getAddressLocation(),
        getSession(),
    ]);

    return (
        <LocationClient
            location={location}
            role={session?.role ?? "worker"}
        />
    );
}