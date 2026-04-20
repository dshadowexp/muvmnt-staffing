"use client";

import { parseISO } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

import { AddressCard } from "@/features/geo/components/address-card";
import { upsertLocationAction } from "@/features/geo/dal/mutations";
import type { AddressLocation } from "@/features/geo/types";
import { ScheduleRequestForm } from "@/features/requests/components/schedule-request-form";
import type { ScheduleRequestFormValues } from "@/features/requests/components/schedule-request-form";
import { upsertStaffRequestScheduleAction } from "@/features/requests/server/actions";
import {
    PENDING_STAFF_REQUEST_KEY,
    type PendingScheduleRequest,
} from "@/app/[locale]/(landing)/find-staff/_form";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";

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

/**
 * Step 1 of the staff-request wizard. Persists a `pending_pricing` draft via
 * a server action and routes to step 2 (`/client/requests/[id]/pricing`).
 *
 * - Reuses the client's latest `pending_pricing` request on submit (update)
 *   so repeat submits do not create duplicate rows.
 * - `/find-staff` sessionStorage prefill wins over `existingDraft` (new intent).
 * - Back from pricing abandons the draft so this page starts empty next visit.
 */
export function NewStaffRequestForm({
    initialLocation,
    existingDraft,
}: NewStaffRequestFormProps) {
    const router = useRouter();
    const t = useTranslations("staffRequest.newPage");
    const [initialValues, setInitialValues] = useState<
        Partial<ScheduleRequestFormValues> | undefined
    >(undefined);
    /** When set, schedule submit updates this row; otherwise a new row is inserted. */
    const [resumeRequestId, setResumeRequestId] = useState<string | null>(null);
    const [hydrated, setHydrated] = useState(false);
    /**
     * Survives React Strict Mode's double effect run: sessionStorage is read once
     * and cleared so the second run must not fall through to `existingDraft`.
     */
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
    }, [existingDraft]);

    async function handleAddressChange(loc: AddressLocation) {
        const { error, message } = await upsertLocationAction(loc);
        if (error) {
            toast.error(message);
            return;
        }
        toast.success(message);
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
                    const result = await upsertStaffRequestScheduleAction({
                        startDate: values.startDate.toISOString(),
                        endDate: values.endDate ? values.endDate.toISOString() : null,
                        positions: values.positions,
                        dailyWindows: values.dailyWindows,
                        ...(resumeRequestId ? { requestId: resumeRequestId } : {}),
                    });

                    if (result.error) {
                        toast.error(result.message);
                        return;
                    }
                    router.push(
                        `/client/requests/${result.requestId}/pricing` as Parameters<
                            typeof router.push
                        >[0],
                    );
                }}
            />
        </div>
    );
}
