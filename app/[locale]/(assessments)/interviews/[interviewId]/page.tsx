import { InterviewFeedbackPanel } from "@/features/interviews/components/interview-feedback-panel";
import { SuspendedItem } from "@/components/suspended-item";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  generateInterviewFeedback,
} from "@/features/interviews/actions";
import { getInterviewForCurrentUser } from "@/features/interviews/dal/queries";
import { formatDateTime } from "@/lib/formatters";
import { CondensedMessages } from "@/services/hume/components/condensed-messages";
import { fetchChatMessages } from "@/services/hume/lib/api";
import { condenseChatMessages } from "@/services/hume/lib/condense-chat-messages";
import { getSession } from "@/lib/session";
import {
  ArrowLeftIcon,
  Loader2Icon,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

export default async function InterviewReviewPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = await params;
  const t = await getTranslations("assessments.interview.review");

  const interview = getInterviewForCurrentUser(interviewId).then((row) => {
    if (row == null) return notFound();
    return row;
  });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <Button variant="ghost" size="sm" className="gap-1 px-0" asChild>
        <Link href="/worker/assessments">
          <ArrowLeftIcon className="size-4" />
          {t("back")}
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("heading")}{" "}
            <SuspendedItem
              item={interview}
              fallback={<Skeleton className="inline-block h-7 w-48" />}
              result={(i) => formatDateTime(new Date(i.created_at))}
            />
          </h1>
          <p className="text-sm text-muted-foreground">
            <SuspendedItem
              item={interview}
              fallback={<Skeleton className="inline-block h-4 w-20" />}
              result={(i) =>
                [i.subject.replace(/_/g, " "), i.duration]
                  .filter(Boolean)
                  .join(" · ")
              }
            />
          </p>
        </div>

        <SuspendedItem
          item={interview}
          fallback={<Skeleton className="h-9 w-36" />}
          result={(i) => {
            if (i.feedback != null) {
              return (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>{t("viewFeedback")}</Button>
                  </DialogTrigger>
                  <DialogContent className="flex max-h-[calc(100%-2rem)] flex-col overflow-y-auto md:max-w-3xl lg:max-w-4xl">
                    <DialogTitle>{t("feedbackDialogTitle")}</DialogTitle>
                    <InterviewFeedbackPanel
                      feedback={i.feedback}
                      completedAt={i.completed_at}
                      retakeHref={
                        i.subject === "profession"
                          ? "/interviews/profession"
                          : i.subject === "resume"
                            ? "/interviews/resume"
                            : undefined
                      }
                    />
                  </DialogContent>
                </Dialog>
              );
            }

            if (i.hume_chat_id) {
              return (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateInterviewFeedback.bind(null, i.id)}
                >
                  {t("generateFeedback")}
                </Button>
              );
            }

            return null;
          }}
        />
      </div>

      <Suspense
        fallback={
          <Loader2Icon className="mx-auto size-12 animate-spin" />
        }
      >
        <Messages interview={interview} />
      </Suspense>
    </div>
  );
}

async function Messages({
  interview,
}: {
  interview: Promise<{ hume_chat_id: string | null }>;
}) {
  const session = await getSession();
  if (!session) return redirect("/sign-in");
  const t = await getTranslations("assessments.interview.review");
  const { hume_chat_id } = await interview;

  if (hume_chat_id == null) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("transcriptEmpty")}
      </p>
    );
  }

  const condensedMessages = condenseChatMessages(
    await fetchChatMessages(hume_chat_id),
  );

  return (
    <CondensedMessages
      messages={condensedMessages}
      user={{ name: session.userId ?? "", imageUrl: "" }} /// TODO: get user name and image url
      className="w-full"
    />
  );
}
