import { BackLink } from "@/components/back-link";
import { Card, CardContent } from "@/components/ui/card";
import { JobInfoForm } from "@/features/requests/components/job-info-form";
import { getJobInfo } from "@/features/requests/dal/queries";
import { Loader2 } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export default async function EditJobInfoPage({
    params,
  }: {
    params: Promise<{ jobId: string }>
  }) {
  const { jobId } = await params;

  return (
    <div className="container my-4 max-w-5xl space-y-4">
      <BackLink backHref={`/app/job-infos/${jobId}`} title="Staff request" />

      <h1 className="text-3xl md:text-4xl">Edit staff request</h1>

      <Card>
        <CardContent>
          <Suspense
            fallback={<Loader2 className="size-24 animate-spin mx-auto" />}
          >
            <SuspendedForm jobInfoId={jobId} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

async function SuspendedForm({ jobInfoId }: { jobInfoId: string }) {
  
    const { error, data: jobInfo } = await getJobInfo(jobInfoId)
    if (error || jobInfo == null) return notFound();
  
    return <JobInfoForm jobInfo={{ ...jobInfo }} />
}