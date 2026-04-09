import { BackLink } from "@/components/back-link";
import { Card, CardContent } from "@/components/ui/card";
import { StaffRequestWizard } from "@/features/requests/components/staff-request-wizard";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { redirect } from "next/navigation";

export default async function StaffRequestPage() {
  const { user } = await getCurrentUser({ allData: true });

  if (user == null) return redirect("/sign-in");
  if (user.role === "worker") return redirect("/app");

  return (
    <div className="container my-4 max-w-5xl space-y-4">
      <BackLink backHref="/app" title="Staff requests" />
      <h1 className="mb-2 text-3xl font-semibold tracking-tight md:text-4xl">
        Request staff
      </h1>
      <p className="text-muted-foreground mb-6 text-sm md:text-base">
        Send your schedule to the server, we match workers in an H3 ring around your site,
        then you pick a tier (Pulse Runner, Harbor Line, or Summit Anchor) and confirm.
      </p>
      <Card>
        <CardContent>
          <StaffRequestWizard />
        </CardContent>
      </Card>
    </div>
  );
}