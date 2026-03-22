import { getSession } from "@/lib/session";
import { createAdminClient } from "@/services/supabase/server";
import { redirect } from "next/navigation";

export async function completeOnboardingStep(stepId: string) {
    const session = await getSession();
    if (!session) {
      return redirect("/sign-in");
    }

    const { userId } = session;
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("onboarding")
        .update({ steps: { [stepId]: { completed: true } } })
        .eq("user_id", userId)
        .single();
}