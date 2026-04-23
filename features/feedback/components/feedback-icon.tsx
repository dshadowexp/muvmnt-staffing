"use client";

import { useState } from "react";
import { MessageSquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedbackDialog } from "@/features/feedback/components/feedback-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function FeedbackIcon() {
  const [open, setOpen] = useState(false);

  return (
    <>
        <Tooltip>
            <TooltipTrigger asChild>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(true)}
                aria-label="Give feedback"
            >
                <MessageSquareIcon className="size-4" />
            </Button>
            </TooltipTrigger>
            <TooltipContent>Give feedback</TooltipContent>
        </Tooltip>

        <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
}