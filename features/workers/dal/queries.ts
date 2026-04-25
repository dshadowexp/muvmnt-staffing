import "server-only";

import { getInterviewBySubjectForUser } from "@/features/interviews/dal/queries";
import { getIdentityVerification, getWorkAuthorization, getWorkerProfile } from "@/features/profile/dal/queries";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkerPendingActionId =
    | "assessment-interview"
    | "payroll-onboarding"
    | "work-authorization"
    | "identity-verification"
    | "processing";

/**
 * A serializable pending action — no JSX, no ReactNode.
 * The UI layer maps `id` to its icon and i18n strings.
 */
export type WorkerPendingAction = {
    id:   WorkerPendingActionId;
    href: string;
};

// ─── Query ────────────────────────────────────────────────────────────────────

/**
 * Resolves which onboarding / compliance tasks a worker still needs to complete.
 * Runs all checks in parallel. Returns a stable-ordered list so the UI always
 * renders actions in the same sequence regardless of which subset is active.
 *
 * @param userId   - Firebase user ID (workers.user_id)
 * @param photoUrl - Current value of workers.photo_url; caller already has it
 *                   from the profile fetch so we avoid a redundant round-trip.
 */
export async function getWorkerPendingActions(): Promise<WorkerPendingAction[]> {
    const worker = await getWorkerProfile();
    if (!worker) return [];

    const { user_id, stage } = worker;
    const actions: WorkerPendingAction[] = [];
    
    if (stage === "interview") {
        const combinedInterview = await getInterviewBySubjectForUser("combined", user_id);
        if (!combinedInterview?.completed_at) {
            actions.push({ id: "assessment-interview", href: "/interviews/combined" });
        }
    } else if (stage === "compliance") {
        const [workAuth, identityVerification] = await Promise.all([
            getWorkAuthorization(),
            getIdentityVerification(),
        ]);

        if (!workAuth) {
            actions.push({ id: "work-authorization", href: "/dashboard/compliance" });
        }

        if (!identityVerification?.verified) {
            actions.push({ id: "identity-verification", href: "/dashboard/compliance" });
        }

        if (workAuth && identityVerification?.verified) {
            actions.push({ id: "processing", href: "/dashboard" });
        }
    } else {
        actions.push({ id: "processing", href: "/dashboard" });
    }

    return actions;
}
