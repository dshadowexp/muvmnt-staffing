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
                    title="Jobs"
                />
                <h1 className="text-3xl md:text-4xl lg:text-5xl mb-4">
                    Create new job
                </h1>
                <p className="text-muted-foreground mb-8">
                    To get started, enter information about the type of job you are wanting
                    to apply for. This can be specific information copied directly from a
                    job listing or general information such as the tech stack you want to
                    work in. The more specific you are in the description the closer the
                    test interviews will be to the real thing.
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