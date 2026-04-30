"use client";

import { useTranslations } from "next-intl";
import {
  BotOffIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  MicIcon,
  PlayCircleIcon,
  UserIcon,
  VideoIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function InterviewInstructionsCard({
  title,
  description,
  durationMins,
}: {
  title: string;
  description: string;
  durationMins: number;
}) {
  const t = useTranslations("assessments.interview.instructions");

  const steps = [
    {
      icon: <BotOffIcon className="size-4" />,
      title: t("step9.title"),
      body: t("step9.body"),
    },
    {
      icon: <PlayCircleIcon className="size-4" />,
      title: t("step8.title"),
      body: t("step8.body"),
    },
    {
      icon: <MicIcon className="size-4" />,
      title: t("step1.title"),
      body: t("step1.body"),
    },
    {
      icon: <VideoIcon className="size-4" />,
      title: t("step2.title"),
      body: t("step2.body"),
    },
    {
      icon: <UserIcon className="size-4" />,
      title: t("step3.title"),
      body: t("step3.body"),
    },
    {
      icon: <CircleDashedIcon className="size-4" />,
      title: t("step4.title"),
      body: t("step4.body"),
    },
    {
      icon: <CheckCircle2Icon className="size-4" />,
      title: t("step5.title"),
      body: t("step5.body"),
    },
  ];

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-balance">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground">
                {step.icon}
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-xs text-amber-800 dark:text-amber-400">
            {t("notice", { minutes: durationMins })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

