import { BackLink } from "@/components/back-link";
import { Card, CardContent } from "@/components/ui/card";
import { JobInfoForm } from "@/features/jobs/components/job-info-form";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { redirect } from "next/navigation";

export default async function NewJobInfoPage() {
    const { user } = await getCurrentUser({ allData: true });

    if (user == null) return redirect("/sign-in");
    if (user.role === "worker") return redirect("/app");

    return (
        <>
            <div className="container my-4 max-w-5xl space-y-4">
                <BackLink
                    backHref={`/app`}
                    title="Staff requests"
                />
                <p className="text-sm font-medium text-muted-foreground">Step 1 of 2</p>
                <h1 className="text-3xl md:text-4xl lg:text-5xl mb-4">
                    Request staff
                </h1>
                <p className="text-muted-foreground mb-8">
                    Describe the role, schedule, and requirements for the staff you need.
                    After you submit, you will review price calculation for this request
                    before it is finalized on your side.
                </p>
                <Card>  
                    <CardContent>
                        <JobInfoForm />
                    </CardContent>
                </Card>
            </div>
        </>
    );
}