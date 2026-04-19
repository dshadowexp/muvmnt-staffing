"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useAuth } from "@/features/auth/providers/auth-provider";
import { useRouter } from "@/i18n/navigation";
import { ScheduleRequestForm } from "@/features/requests/components/schedule-request-form";
import { createStaffRequestDraftAction } from "@/features/requests/server/actions";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { AddressCard } from "@/features/geo/components/address-card";

/**
 * sessionStorage key read by `/client/requests/new` to prefill the schedule a
 * logged-out user filled out on the landing page (so nothing is lost across
 * the sign-in / sign-up bounce).
 *
 * Same shape as `StaffRequestScheduleValues` but with `Date`s serialized to
 * ISO strings so JSON round-trips cleanly.
 */
export const PENDING_STAFF_REQUEST_KEY = "muvmnt:pending-staff-request";

export type PendingScheduleRequest = {
    startDate: string;
    endDate: string | null;
    positions: number;
    dailyWindows: { date: string; slots: { startTime: string; endTime: string }[] }[];
    savedAt: string;
};

/**
 * Public landing form. We don't preemptively bounce visitors to sign-up — the
 * submit path is identical to the in-app wizard:
 *
 *  - Authenticated client → create the draft right here, jump to step 2.
 *  - Anonymous (or wrong role) → stash the schedule in sessionStorage and
 *    navigate to `/client/requests/new`. Middleware then handles the auth
 *    redirect (preserving `?redirect=/client/requests/new`), so the user lands
 *    on the wizard step they expected after authenticating — sign-in or
 *    sign-up, whichever they chose.
 */
export function FindStaffForm() {
    const router = useRouter();
    const { authUser } = useAuth();
    const t = useTranslations("findStaff.form");

    const isClient = authUser?.role === "client";

    return (
        <div className="flex flex-col gap-6">  
            <Field>
                <FieldLabel>{t("addressTitle")}</FieldLabel>
                <FieldDescription>{t("addressDescription")}</FieldDescription>
                <AddressCard
                    value={undefined}
                    onChange={() => {}}
                />
            </Field>
            <ScheduleRequestForm
                submitLabel={t("submit")}
                onSubmit={async (values) => {
                    const payload: PendingScheduleRequest = {
                        startDate: values.startDate.toISOString(),
                        endDate: values.endDate ? values.endDate.toISOString() : null,
                        positions: values.positions,
                        dailyWindows: values.dailyWindows,
                        savedAt: new Date().toISOString(),
                    };

                    if (isClient) {
                        const created = await createStaffRequestDraftAction({
                            startDate: payload.startDate,
                            endDate: payload.endDate,
                            positions: payload.positions,
                            dailyWindows: payload.dailyWindows,
                        });
                        if (created.error) {
                            toast.error(created.message);
                            return;
                        }
                        router.push(
                            `/client/requests/${created.requestId}/pricing` as Parameters<
                                typeof router.push
                            >[0],
                        );
                        return;
                    }

                    try {
                        if (typeof window !== "undefined") {
                            window.sessionStorage.setItem(
                                PENDING_STAFF_REQUEST_KEY,
                                JSON.stringify(payload),
                            );
                        }
                    } catch {
                        /* sessionStorage may be unavailable — continue regardless */
                    }

                    router.push(
                        "/client/requests/new" as Parameters<typeof router.push>[0],
                    );
                }}
            />
        </div>
    );
}
