"use client";

import { useState } from "react";
import { MessageSquareIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { FeedbackDialog } from "@/features/feedback/components/feedback-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function FeedbackIcon() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("feedback");

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            aria-label={t("giveFeedback")}
          >
            <MessageSquareIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("giveFeedback")}</TooltipContent>
      </Tooltip>

      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
}