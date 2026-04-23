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
import { useAuth } from "@/features/auth/providers/auth-provider";
import { LoadingSwap } from "@/components/ui/loading-swap";

export function FeedbackIcon() {
  const { loading } = useAuth();
  const [open, setOpen] = useState(false);
  const t = useTranslations("feedback");

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={loading}
            onClick={() => setOpen(true)}
            aria-label={t("giveFeedback")}
          >
            <LoadingSwap isLoading={loading}>
              <MessageSquareIcon className="size-4" />
            </LoadingSwap>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("giveFeedback")}</TooltipContent>
      </Tooltip>

      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
}