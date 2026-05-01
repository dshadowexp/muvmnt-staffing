import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getAddressLocation } from "@/features/geo/dal/queries";
import {
    formatStaffRequestSiteLine,
    parseSiteRowFromStaffRequestLocation,
} from "@/features/requests/lib/staff-request-location-json";
import type { Database } from "@/supabase/types/database";

type StaffRequestLocationCardProps = {
    /** When set, shows this request’s stored site (from `staff_requests.location`). */
    requestLocation?: Database["public"]["Tables"]["staff_requests"]["Row"]["location"];
};

/**
 * Work site for the current step: request-specific `location` when present,
 * otherwise the signed-in client’s saved address.
 */
export async function StaffRequestLocationCard({
    requestLocation,
}: StaffRequestLocationCardProps) {
    const site = parseSiteRowFromStaffRequestLocation(
        requestLocation ?? null,
    );
    if (site) {
        const line = formatStaffRequestSiteLine(site);
        return (
            <Card className="border-border/80 overflow-hidden py-0">
                <CardContent className="flex flex-col gap-1.5 px-4 py-3.5">
                    <div className="flex items-start gap-3">
                        <MapPin
                            className="text-muted-foreground mt-0.5 size-4 shrink-0"
                            aria-hidden
                        />
                        <p className="text-foreground min-w-0 flex-1 text-sm leading-snug break-words">
                            {line}
                        </p>
                    </div>
                    {site.instructions ? (
                        <p className="text-muted-foreground pl-7 text-xs leading-snug">
                            {site.instructions}
                        </p>
                    ) : null}
                </CardContent>
            </Card>
        );
    }

    const location = await getAddressLocation();

    return (
        <Card className="border-border/80 overflow-hidden py-0">
            <CardContent className="flex items-start gap-3 px-4 py-3.5">
                <MapPin
                    className="text-muted-foreground mt-0.5 size-4 shrink-0"
                    aria-hidden
                />
                <p className="text-foreground min-w-0 flex-1 text-sm leading-snug break-words">
                    {location?.address ?? "—"}
                </p>
            </CardContent>
        </Card>
    );
}
