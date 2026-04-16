import { BackLink } from "@/components/back-link";
import { StaffRequestWizard } from "@/features/requests/components/staff-request-wizard";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { redirect } from "next/navigation";

export default async function StaffRequestPage() {
  const { user } = await getCurrentUser({ allData: true });

  if (user == null) return redirect("/sign-in");
  if (user.role === "worker") return redirect("/app");

  return (
    <div className="w-full max-w-5xl space-y-4">
      <BackLink backHref="/client" title="Your requests" />
      <StaffRequestWizard />
    </div>
  );
}
