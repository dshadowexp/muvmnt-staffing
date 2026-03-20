import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const { authUser, user } = await getCurrentUser({ allData: true });

  if (authUser == null) return redirect("/sign-in");
  if (user?.is_active == true) return redirect("/app");

  redirect("/onboarding/verification");
}