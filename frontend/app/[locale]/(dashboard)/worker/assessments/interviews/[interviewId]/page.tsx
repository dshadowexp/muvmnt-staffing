import { MarkdownRenderer } from "@/components/markdown-renderer";
import { SuspendedItem } from "@/components/suspended-item";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { generateInterviewFeedback } from "@/features/interviews/dal/mutations";
import { formatDateTime } from "@/lib/formatters";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { CondensedMessages } from "@/services/hume/components/condensed-messages";
import { fetchChatMessages } from "@/services/hume/lib/api";
import { condenseChatMessages } from "@/services/hume/lib/condense-chat-messages";
import { Loader2Icon } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";


export default async function InterviewPage({
  params,
}: {
  params: Promise<{ jobInfoId: string; interviewId: string }>
}) {
  const { jobInfoId, interviewId } = await params

  const interview = getCurrentUser().then(
    async ({ user }) => {
      if (user == null) return notFound()

      const interview = await getInterview(interviewId, user.id)
      if (interview == null) return notFound()
      return interview
    }
  )

  return (
    <div className="w-full my-4 space-y-4">
      <div className="space-y-6">
        <div className="flex gap-2 justify-between">
          <div className="space-y-2 mb-6">
            <h1 className="text-3xl md:text-4xl">
              Interview:{" "}
              <SuspendedItem
                item={interview}
                fallback={<Skeleton className="w-48" />}
                result={i => formatDateTime(i.createdAt)}
              />
            </h1>
            <p className="text-muted-foreground">
              <SuspendedItem
                item={interview}
                fallback={<Skeleton className="w-24" />}
                result={i => i.duration}
              />
            </p>
          </div>
          <SuspendedItem
            item={interview}
            fallback={<Skeleton className="w-32" />}
            result={i =>
              i.feedback == null ? (
                <ActionButton
                  action={generateInterviewFeedback.bind(null, i.id)}
                >
                  Generate Feedback
                </ActionButton>
              ) : (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>View Feedback</Button>
                  </DialogTrigger>
                  <DialogContent className="md:max-w-3xl lg:max-w-4xl max-h-[calc(100%-2rem)] overflow-y-auto flex flex-col">
                    <DialogTitle>Feedback</DialogTitle>
                    <MarkdownRenderer>{i.feedback}</MarkdownRenderer>
                  </DialogContent>
                </Dialog>
              )
            }
          />
        </div>
        <Suspense
          fallback={<Loader2Icon className="animate-spin size-24 mx-auto" />}
        >
          <Messages interview={interview} />
        </Suspense>
      </div>
    </div>
  )
}

async function Messages({
  interview,
}: {
  interview: Promise<{ humeChatId: string | null }>
}) {
  const { user } = await getCurrentUser({ allData: true })
  if (user == null) return notFound()
  const { humeChatId } = await interview
  if (humeChatId == null) return notFound()

  const condensedMessages = condenseChatMessages(
    await fetchChatMessages(humeChatId)
  )

  return (
    <CondensedMessages
      messages={condensedMessages}
      user={{ name: user.email ?? "", imageUrl: "" }}
      className="w-full"
    />
  )
}

async function getInterview(id: string, userId: string) {
  "use cache"
//   cacheTag(getInterviewIdTag(id))

  const interview = { id: "123", createdAt: new Date(), duration: "10 minutes", feedback: "Good interview", humeChatId: "123" }

  if (interview == null) return null

//   cacheTag(getJobInfoIdTag(interview.jobInfo.id))
//   if (interview.jobInfo.userId !== userId) return null

  return interview
}