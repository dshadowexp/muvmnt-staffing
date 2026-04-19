import { getAddressLocation } from "@/features/geo/dal/queries";
import { LocationClient } from "./_client";

export default async function LocationPage() {
    const location = await getAddressLocation();

    return (
       <>
            <LocationClient location={location} />
        </>
    );
}