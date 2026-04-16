import { getOnboardingCompletionStatus } from "@/features/onboarding/dal/queries";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const { authUser, user } = await getCurrentUser({ allData: true });

  if (authUser == null) return redirect("/sign-in");
  if (user?.is_active == true) return redirect("/app");

  if (user?.role === "worker") {
    const { is_completed } = await getOnboardingCompletionStatus(user.id);
    if (is_completed) return redirect("/review");
  }

  redirect("/onboarding/verification");
}