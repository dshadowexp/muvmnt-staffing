import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getAddressLocation } from "@/features/geo/dal/queries";

/** Signed-in client’s saved address (same as request creation). */
export async function StaffRequestLocationCard() {
    const location = await getAddressLocation();

    return (
        <Card className="border-border/80 overflow-hidden py-0">
            <CardContent className="flex items-start gap-3 px-4 py-3.5">
                <MapPin
                    className="text-muted-foreground mt-0.5 size-4 shrink-0"
                    aria-hidden
                />
                <p className="text-foreground min-w-0 flex-1 text-sm leading-snug break-words">
                    {location!.address}
                </p>
            </CardContent>
        </Card>
    );
}
