import "server-only";

import { createAdminClient } from "@/services/supabase/server";
import { getOrCreateCombinedInterview } from "@/features/interviews/lib/get-or-create-combined-interview";
import { isAssessmentInterviewLocked } from "@/features/interviews/lib/interview-feedback-json";
import {
  getIdentityVerification,
  getWorkAuthorization,
  getWorkerProfile,
} from "@/features/profile/dal/queries";
import { isWorkAuthorizationSubmitted } from "@/features/workers/lib/work-authorization-submitted";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkerPendingActionId =
  | "assessment-interview"
  | "identity-verification"
  | "work-authorization"
  | "payroll-onboarding"
  | "setup-location"
  | "setup-availability"
  | "processing";

export type WorkerPendingAction = {
  id: WorkerPendingActionId;
  href: string;
};

// ─── Query ────────────────────────────────────────────────────────────────────

/**
 * Next onboarding / compliance tasks for the current worker (stable ordering).
 */
export async function getWorkerPendingActions(): Promise<WorkerPendingAction[]> {
  const worker = await getWorkerProfile();
  if (!worker) return [];

  const { user_id, stage, cell_id } = worker;
  const actions: WorkerPendingAction[] = [];

  if (stage === "interview") {
    const interview = await getOrCreateCombinedInterview(user_id);
    if (!isAssessmentInterviewLocked(interview)) {
      actions.push({
        id: "assessment-interview",
        href: `/interviews/${interview.id}`,
      });
    } else {
      actions.push({ id: "processing", href: "/dashboard" });
    }
    return actions;
  }

  if (stage === "compliance") {
    const [workAuth, identityVerification] = await Promise.all([
      getWorkAuthorization(),
      getIdentityVerification(),
    ]);

    if (!identityVerification?.verified) {
      actions.push({
        id: "identity-verification",
        href: "/dashboard/compliance",
      });
    } else if (!isWorkAuthorizationSubmitted(workAuth)) {
      actions.push({
        id: "work-authorization",
        href: "/dashboard/compliance",
      });
    } else {
      actions.push({ id: "processing", href: "/dashboard" });
    }
    return actions;
  }

  if (stage === "payroll") {
    actions.push({ id: "payroll-onboarding", href: "/payroll" });
    return actions;
  }

  if (stage === "availability") {
    if (!cell_id?.trim()) {
      actions.push({ id: "setup-location", href: "/dashboard/profile" });
      return actions;
    }

    const supabase = await createAdminClient();
    const { count, error } = await supabase
      .from("availability")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id);

    if (error || !count || count < 1) {
      actions.push({
        id: "setup-availability",
        href: "/dashboard/availability",
      });
      return actions;
    }

    actions.push({ id: "processing", href: "/dashboard" });
    return actions;
  }

  if (stage === "live") {
    return [];
  }

  actions.push({ id: "processing", href: "/dashboard" });
  return actions;
}
