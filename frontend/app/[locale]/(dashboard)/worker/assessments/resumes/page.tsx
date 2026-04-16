import { Loader2Icon } from "lucide-react"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { ResumePageClient } from "./_client"
import { BackLink } from "@/components/back-link"
import { canRunResumeAnalysis } from "@/features/resume-analysis/permissions"

export default async function ResumePage({
  params,
}: {
  params: Promise<{ jobInfoId: string }>
}) {
  const { jobInfoId } = await params

  return (
    <div className="flex h-screen-header w-full max-w-6xl flex-col items-start space-y-4">
      <BackLink backHref={`/app/job-infos/${jobInfoId}`} title="Staff request" />
      <Suspense
        fallback={<Loader2Icon className="animate-spin size-24 m-auto" />}
      >
        <SuspendedComponent jobInfoId={jobInfoId} />
      </Suspense>
    </div>
  )
}

async function SuspendedComponent({ jobInfoId }: { jobInfoId: string }) {
  if (!(await canRunResumeAnalysis())) return redirect("/app/upgrade")

  return <ResumePageClient jobInfoId={jobInfoId} />
}