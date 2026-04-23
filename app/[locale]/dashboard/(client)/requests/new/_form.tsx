"use client";

import { parseISO } from "date-fns";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import {
    PENDING_STAFF_REQUEST_KEY,
    type PendingScheduleRequest,
} from "@/app/[locale]/(landing)/find-staff/_form";
import { BackLink } from "@/components/back-link";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { AddressCard } from "@/features/geo/components/address-card";
import type { AddressLocation } from "@/features/geo/types";
import { upsertLocationAction } from "@/features/geo/dal/mutations";
import {
    StaffRequestJobProfileSettingsRow,
    type StaffRequestJobProfileApplyPayload,
} from "@/features/requests/components/staff-request-job-profile-settings";
import { ScheduleRequestForm } from "@/features/requests/components/schedule-request-form";
import type { ScheduleRequestFormValues } from "@/features/requests/components/schedule-request-form";
import {
    DEFAULT_STAFF_REQUEST_PROFESSION,
    mergePersistedStaffRequestRequirements,
} from "@/features/requests/constants";
import { upsertStaffRequestScheduleAction } from "@/features/requests/server/actions";
import { useRouter } from "@/i18n/navigation";
import { normalizeProfessionId } from "@/lib/professions";
import { latLngToCell } from "h3-js";
import { H3_RESOLUTION } from "@/lib/constants";

export type { PendingScheduleRequest };

export type ExistingScheduleDraft = {
    id: string;
    start_date: string;
    end_date: string | null;
    positions: number;
    daily_time_windows: {
        date: string;
        slots: { startTime: string; endTime: string }[];
    }[];
};

export type NewStaffRequestFormProps = {
    initialLocation: AddressLocation | null;
    existingDraft: ExistingScheduleDraft | null;
    jobProfile: StaffRequestJobProfileApplyPayload;
    onJobProfileFromLanding?: (
        profile: StaffRequestJobProfileApplyPayload,
    ) => void;
};

function draftToFormValues(draft: ExistingScheduleDraft): Partial<ScheduleRequestFormValues> {
    const start = parseISO(draft.start_date.slice(0, 10));
    const end = draft.end_date ? parseISO(draft.end_date.slice(0, 10)) : null;
    return {
        startDate: start,
        endDate: end,
        positions: draft.positions,
        dailyWindows: draft.daily_time_windows,
    };
}

export function NewStaffRequestForm({
    initialLocation,
    existingDraft,
    jobProfile,
    onJobProfileFromLanding,
}: NewStaffRequestFormProps) {
    const router = useRouter();
    const t = useTranslations("staffRequest.newPage");
    const [initialValues, setInitialValues] = useState<
        Partial<ScheduleRequestFormValues> | undefined
    >(undefined);
    const [resumeRequestId, setResumeRequestId] = useState<string | null>(null);
    const [hydrated, setHydrated] = useState(false);
    const landingPayloadRef = useRef<PendingScheduleRequest | null | undefined>(
        undefined,
    );

    useEffect(() => {
        if (landingPayloadRef.current === undefined) {
            try {
                if (typeof window !== "undefined") {
                    const raw = window.sessionStorage.getItem(PENDING_STAFF_REQUEST_KEY);
                    if (raw) {
                        landingPayloadRef.current = JSON.parse(
                            raw,
                        ) as PendingScheduleRequest;
                        window.sessionStorage.removeItem(PENDING_STAFF_REQUEST_KEY);
                    } else {
                        landingPayloadRef.current = null;
                    }
                } else {
                    landingPayloadRef.current = null;
                }
            } catch {
                landingPayloadRef.current = null;
            }
        }

        const landing = landingPayloadRef.current;
        if (landing) {
            const hasProfileExtra =
                landing.profession != null ||
                (landing.tasks?.length ?? 0) > 0 ||
                (landing.requirements?.length ?? 0) > 0;
            if (hasProfileExtra && onJobProfileFromLanding) {
                onJobProfileFromLanding({
                    profession: normalizeProfessionId(
                        landing.profession?.trim() ||
                            DEFAULT_STAFF_REQUEST_PROFESSION,
                    ),
                    tasks: landing.tasks ?? [],
                    requirements: mergePersistedStaffRequestRequirements(
                        landing.requirements ?? [],
                    ),
                });
            }

            const start = new Date(landing.startDate);
            const end = landing.endDate ? new Date(landing.endDate) : null;
            if (!Number.isNaN(start.getTime())) {
                setInitialValues({
                    startDate: start,
                    endDate: end,
                    positions: landing.positions,
                    dailyWindows: landing.dailyWindows,
                });
                setResumeRequestId(null);
            } else if (existingDraft) {
                setInitialValues(draftToFormValues(existingDraft));
                setResumeRequestId(existingDraft.id);
            }
        } else if (existingDraft) {
            setInitialValues(draftToFormValues(existingDraft));
            setResumeRequestId(existingDraft.id);
        }

        setHydrated(true);
    }, [existingDraft, onJobProfileFromLanding]);

    async function handleAddressChange(loc: AddressLocation) {
        const { error, message } = await upsertLocationAction(loc);
        if (error) {
            toast.error(message);
            return;
        }
        router.refresh();
    }

    if (!hydrated) return null;

    return (
        <div className="flex flex-col gap-6">
            <Field>
                <FieldLabel>{t("addressTitle")}</FieldLabel>
                <FieldDescription>{t("addressDescription")}</FieldDescription>
                <AddressCard
                    value={initialLocation ?? undefined}
                    onChange={handleAddressChange}
                />
            </Field>

            <ScheduleRequestForm
                key={resumeRequestId ?? "new"}
                initialValues={initialValues}
                onSubmit={async (values) => {
                    if (!initialLocation) {
                        toast.error(
                            "Please include the location before submitting a request.",
                        );
                        return;
                    }

                    const cellId = latLngToCell(
                        initialLocation.lat,
                        initialLocation.lng,
                        H3_RESOLUTION,
                    );
                    const result = await upsertStaffRequestScheduleAction({
                        startDate: values.startDate.toISOString(),
                        endDate: values.endDate
                            ? values.endDate.toISOString()
                            : null,
                        positions: values.positions,
                        dailyWindows: values.dailyWindows,
                        cellId,
                        profession: jobProfile.profession,
                        tasks: jobProfile.tasks,
                        requirements: jobProfile.requirements,
                        location: {
                            lat: initialLocation.lat,
                            lng: initialLocation.lng,
                            address: initialLocation.address,
                            postal_code: initialLocation.postalCode,
                            address_line_2: initialLocation.addressLine2,
                            instructions: initialLocation.instructions,
                        },
                        ...(resumeRequestId ? { requestId: resumeRequestId } : {}),
                    });

                    if (result.error) {
                        toast.error(result.message);
                        return;
                    }
                    router.push(
                        `/dashboard/requests/${result.requestId}/pricing` as Parameters<
                            typeof router.push
                        >[0],
                    );
                }}
            />
        </div>
    );
}

export type NewStaffRequestPageClientProps = {
    backTitle: string;
    step1Title: string;
    initialJobProfile: StaffRequestJobProfileApplyPayload;
    initialLocation: AddressLocation | null;
    existingDraft: ExistingScheduleDraft | null;
};

export function NewStaffRequestPageClient({
    backTitle,
    step1Title,
    initialJobProfile,
    initialLocation,
    existingDraft,
}: NewStaffRequestPageClientProps) {
    const tWizard = useTranslations("staffRequest.wizard");
    const tProf = useTranslations("professions");
    const [jobProfile, setJobProfile] =
        useState<StaffRequestJobProfileApplyPayload>(initialJobProfile);

    const handleApplyJobProfile = useCallback(
        (payload: StaffRequestJobProfileApplyPayload) => {
            setJobProfile(payload);
        },
        [],
    );

    const handleJobProfileFromLanding = useCallback(
        (profile: StaffRequestJobProfileApplyPayload) => {
            setJobProfile(profile);
        },
        [],
    );

    return (
        <div className="w-full max-w-3xl space-y-6">
            <div className="space-y-6">
                <BackLink backHref="/dashboard/requests" title={backTitle} />
                <StaffRequestJobProfileSettingsRow
                    profession={jobProfile.profession}
                    tasks={jobProfile.tasks}
                    requirements={jobProfile.requirements}
                    onApply={handleApplyJobProfile}
                >
                    <header className="space-y-2">
                        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                            {step1Title}
                        </h1>
                        <p className="text-muted-foreground text-sm md:text-base">
                            {tWizard("step1Description", {
                                profession: tProf(jobProfile.profession),
                            })}
                        </p>
                    </header>
                </StaffRequestJobProfileSettingsRow>
            </div>

            <NewStaffRequestForm
                initialLocation={initialLocation}
                existingDraft={existingDraft}
                jobProfile={jobProfile}
                onJobProfileFromLanding={handleJobProfileFromLanding}
            />
        </div>
    );
}
