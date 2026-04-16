import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { notFound } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { fetchAccessToken } from "hume"
import { env } from "@/data/env/server"
import { VoiceProvider } from "@humeai/voice-react"
import { StartCall } from "./_start-call";
import { getStaffRequest } from "@/features/requests/dal/queries";
import { canCreateInterview } from "@/features/interviews/permission";

export default async function InterviewPage({
    params,
  }: {
    params: Promise<{ id: string }>
  }) {
    const { id } = await params;

    return (
        <Suspense
            fallback={
                <div className="h-screen-header flex items-center justify-center">
                <Loader2Icon className="animate-spin size-24" />
                </div>
            }
        >
            <SuspendedComponent jobInfoId={id} />
        </Suspense>
    );
}

async function SuspendedComponent({ jobInfoId }: { jobInfoId: string }) {
    const { user, authUser } = await getCurrentUser({
      allData: true,
    })
    // if (userId == null || user == null) return redirectToSignIn()
  
    if (!(await canCreateInterview())) return redirect("/app/upgrade")
  
    const { error, data: jobInfo } = await getStaffRequest(jobInfoId);
    if (error) return notFound();
    if (jobInfo == null) return notFound()
  
    const accessToken = await fetchAccessToken({
      apiKey: env.HUME_API_KEY,
      secretKey: env.HUME_SECRET_KEY,
    })
  
    return (
      <VoiceProvider>
        <StartCall jobInfo={jobInfo} user={{ name: authUser?.displayName ?? "", imageUrl: authUser?.photoURL ?? "" }} accessToken={accessToken} />
      </VoiceProvider>
    )
  }