"use client";

import { useState } from "react";
import { unstable_rethrow } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronRightIcon, LandmarkIcon, CircleDashedIcon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { setupPayrollAction } from "../actions";

type PayrollOnboardingTaskCardProps = {
  title: string;
  description: string;
};

export function PayrollOnboardingTaskCard({
  title,
  description,
}: PayrollOnboardingTaskCardProps) {
  const t = useTranslations("dashboard.worker.home.payrollOnboarding");
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      await setupPayrollAction();
    } catch (error) {
      unstable_rethrow(error);
      toast.error(
        error instanceof Error ? error.message : t("startError"),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => void handleClick()}
      aria-label={title}
      className="block w-full cursor-pointer rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-70"
    >
      <Card
        size="sm"
        className="h-full transition-colors hover:border-primary/50 hover:bg-muted/30"
      >
        <CardContent className="flex items-start gap-3 p-4">
          <div className="rounded-md bg-muted p-2">
            <LandmarkIcon className="size-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-semibold">{title}</p>
            <p className="text-muted-foreground line-clamp-2 text-sm">
              {description}
            </p>
          </div>
          {pending ? (
            <CircleDashedIcon className="size-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          )}
        </CardContent>
      </Card>
    </button>
  );
}
