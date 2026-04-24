import "server-only";

import { getInterviewBySubjectForUser } from "@/features/interviews/dal/queries";
import { payrollAccountMeetsOnboardingRequirements } from "@/features/payments/payroll/dal/queries";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkerPendingActionId =
    | "profile-photo"
    | "profession-interview"
    | "resume-interview"
    | "payroll-onboarding"
    | "work-authorization"
    | "identity-verification";

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
export async function getWorkerPendingActions(
    userId:   string,
    photoUrl: string | null,
): Promise<WorkerPendingAction[]> {
    const [professionInterview, resumeInterview, payrollOk] = await Promise.all([
        getInterviewBySubjectForUser("profession", userId),
        getInterviewBySubjectForUser("resume", userId),
        payrollAccountMeetsOnboardingRequirements(userId),
    ]);

    const actions: WorkerPendingAction[] = [];

    if (!photoUrl) {
        actions.push({ id: "profile-photo", href: "/dashboard/profile" });
    }

    if (!professionInterview?.completed_at) {
        actions.push({ id: "profession-interview", href: "/interviews/profession" });
    }

    if (!resumeInterview?.completed_at) {
        actions.push({ id: "resume-interview", href: "/interviews/resume" });
    }

    // if (!payrollOk.ok) {
    //     actions.push({ id: "payroll-onboarding", href: "/dashboard/payroll" });
    // }

    return actions;
}
