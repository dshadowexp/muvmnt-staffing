"use client";

import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { toast } from "sonner";
import { WorkerProfileForm } from "@/features/profile/components/worker-profile-form";
import { mapWorkerProfileToFormValues, WorkerProfileFormInput, WorkerProfileValues, workerSchema } from "@/features/profile/schemas/worker";
import { ProfessionalRole } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { upsertWorkerAction } from "@/features/profile/actions/worker-actions";
import { profileAction } from "./_action";

export function ProfileClient({ workerProfile }: { workerProfile: WorkerProfileFormInput | null }) {
    const form = useForm<WorkerProfileValues>({
        defaultValues: workerProfile
          ? mapWorkerProfileToFormValues(workerProfile)
          : {
                firstName: "",
                lastName: "",
                dateOfBirth: "",
                profession: "" as ProfessionalRole,
                yearsExp: 0,
            },
        resolver: zodResolver(workerSchema),
    });
    
    async function handleSubmit(data: WorkerProfileValues) {
        const { error, message } = await upsertWorkerAction(data);
        if (error) {
          toast.error(message);
        } else {
          toast.success(message);
        }
    }

    return (
        <form action={profileAction} className="space-y-6">
            <WorkerProfileForm form={form} />
            <ContinueButton />
        </form>
    );
}