"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CopyIcon, RefreshCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { rotateWorkerCalendarFeedAction } from "@/features/calendar/actions/worker-calendar-feed-actions";

export function WorkerCalendarSubscribeCard({
  initialSubscriptionUrl,
}: {
  initialSubscriptionUrl: string;
}) {
  const t = useTranslations("dashboard.worker.calendarFeed");
  const [url, setUrl] = useState(initialSubscriptionUrl);
  const [pending, startTransition] = useTransition();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  function rotate() {
    startTransition(async () => {
      const result = await rotateWorkerCalendarFeedAction();
      if (result.ok) {
        setUrl(result.subscriptionUrl);
        toast.success(t("rotateSuccess"));
      } else {
        toast.error(result.message || t("rotateError"));
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-muted-foreground text-sm" htmlFor="cal-feed-url">
            {t("urlLabel")}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id="cal-feed-url"
              readOnly
              value={url}
              className="font-mono text-xs sm:flex-1"
            />
            <Button type="button" variant="secondary" onClick={() => void copyLink()}>
              <CopyIcon className="mr-2 size-4" aria-hidden />
              {t("copy")}
            </Button>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              className="self-start"
            >
              <RefreshCwIcon className="mr-2 size-4" aria-hidden />
              {pending ? t("rotating") : t("rotate")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("rotateConfirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("rotateConfirmDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("rotateCancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={() => rotate()}>{t("rotateConfirm")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
          <li>{t("hintGoogle")}</li>
          <li>{t("hintApple")}</li>
        </ul>
        <p className="text-muted-foreground text-sm">{t("privacy")}</p>
      </CardContent>
    </Card>
  );
}
