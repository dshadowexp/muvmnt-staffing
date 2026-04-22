"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Users } from "lucide-react";

import { CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { AddressCard } from "@/features/geo/components/address-card";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { ScheduleRequestForm } from "@/features/requests/components/schedule-request-form";
import {
    StaffRequestJobProfileSettingsRow,
    type StaffRequestJobProfileApplyPayload,
} from "@/features/requests/components/staff-request-job-profile-settings";
import {
    DEFAULT_STAFF_REQUEST_PROFESSION,
    mergePersistedStaffRequestRequirements,
} from "@/features/requests/constants";
import { createStaffRequestDraftAction } from "@/features/requests/server/actions";
import { useRouter } from "@/i18n/navigation";
import { latLngToCell } from "h3-js";
import { H3_RESOLUTION } from "@/lib/constants";

/**
 * sessionStorage key read by `/dashboard/requests/new` to prefill the schedule a
 * logged-out user filled out on the landing page (so nothing is lost across
 * the sign-in / sign-up bounce).
 *
 * Same shape as `StaffRequestScheduleValues` but with `Date`s serialized to
 * ISO strings so JSON round-trips cleanly.
 */
export const PENDING_STAFF_REQUEST_KEY = "readykare:pending-staff-request";

export type PendingScheduleRequest = {
    startDate: string;
    endDate: string | null;
    positions: number;
    dailyWindows: { date: string; slots: { startTime: string; endTime: string }[] }[];
    savedAt: string;
    /** Present for new saves; omitted in older session payloads. */
    cellId?: string;
    profession?: string;
    tasks?: string[];
    requirements?: string[];
};

type FindStaffFormProps = {
    jobProfile: StaffRequestJobProfileApplyPayload;
};

/**
 * Public landing form. We don't preemptively bounce visitors to sign-up — the
 * submit path is identical to the in-app wizard:
 *
 *  - Authenticated client → create the draft right here, jump to step 2.
 *  - Anonymous (or wrong role) → stash the schedule in sessionStorage and
 *    navigate to `/dashboard/requests/new`. Middleware then handles the auth
 *    redirect (preserving `?redirect=/dashboard/requests/new`), so the user lands
 *    on the wizard step they expected after authenticating — sign-in or
 *    sign-up, whichever they chose.
 */
function FindStaffForm({ jobProfile }: FindStaffFormProps) {
    const router = useRouter();
    const { authUser } = useAuth();
    const t = useTranslations("findStaff.form");
    const cellIdRef = useRef<string | null>(null);

    const isClient = authUser?.role === "client";

    return (
        <div className="flex flex-col gap-6">
            <Field>
                <FieldLabel>{t("addressTitle")}</FieldLabel>
                <FieldDescription>{t("addressDescription")}</FieldDescription>
                <AddressCard
                    value={undefined}
                    onChange={(loc) => {
                        cellIdRef.current = latLngToCell(loc.lat, loc.lng, H3_RESOLUTION);
                    }}
                />
            </Field>
            <ScheduleRequestForm
                submitLabel={t("submit")}
                onSubmit={async (values) => {
                    const cellId = cellIdRef.current;
                    if (!cellId) {
                        toast.error(t("addressRequired"));
                        return;
                    }

                    const payload: PendingScheduleRequest = {
                        startDate: values.startDate.toISOString(),
                        endDate: values.endDate ? values.endDate.toISOString() : null,
                        positions: values.positions,
                        dailyWindows: values.dailyWindows,
                        savedAt: new Date().toISOString(),
                        cellId,
                        profession: jobProfile.profession,
                        tasks: jobProfile.tasks,
                        requirements: mergePersistedStaffRequestRequirements(
                            jobProfile.requirements,
                        ),
                    };

                    if (isClient) {
                        const created = await createStaffRequestDraftAction({
                            startDate: payload.startDate,
                            endDate: payload.endDate,
                            positions: payload.positions,
                            dailyWindows: payload.dailyWindows,
                            cellId: payload.cellId,
                            profession: payload.profession,
                            tasks: payload.tasks,
                            requirements: payload.requirements,
                        });
                        if (created.error) {
                            toast.error(created.message);
                            return;
                        }
                        router.push(
                            `/dashboard/requests/${created.requestId}/pricing` as Parameters<
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
                        "/dashboard/requests/new" as Parameters<typeof router.push>[0],
                    );
                }}
            />
        </div>
    );
}

export type FindStaffLeadCardProps = {
    cardTitle: string;
    cardSubtitle: string;
};

export function FindStaffLeadCard({ cardTitle, cardSubtitle }: FindStaffLeadCardProps) {
    const [jobProfile, setJobProfile] = useState<StaffRequestJobProfileApplyPayload>(
        () => ({
            profession: DEFAULT_STAFF_REQUEST_PROFESSION,
            tasks: [],
            requirements: [],
        }),
    );

    const handleApplyJobProfile = useCallback(
        (payload: StaffRequestJobProfileApplyPayload) => {
            setJobProfile(payload);
        },
        [],
    );

    return (
        <>
            <div className="relative overflow-hidden bg-primary px-7 py-6">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_100%_at_100%_100%,rgba(255,255,255,0.12)_0%,transparent_60%)]" />
                <div className="relative z-10">
                    <StaffRequestJobProfileSettingsRow
                        profession={jobProfile.profession}
                        tasks={jobProfile.tasks}
                        requirements={jobProfile.requirements}
                        onApply={handleApplyJobProfile}
                        triggerOnPrimary
                        rowClassName="items-start"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-primary-foreground/15 flex size-10 shrink-0 items-center justify-center rounded-xl">
                                <Users className="text-primary-foreground size-5" />
                            </div>
                            <div>
                                <h1 className="text-primary-foreground font-[var(--font-display)] text-lg font-extrabold leading-tight">
                                    {cardTitle}
                                </h1>
                                <p className="text-primary-foreground/70 text-[0.82rem] font-light">
                                    {cardSubtitle}
                                </p>
                            </div>
                        </div>
                    </StaffRequestJobProfileSettingsRow>
                </div>
            </div>

            <CardContent className="p-7">
                <FindStaffForm jobProfile={jobProfile} />
            </CardContent>
        </>
    );
}
