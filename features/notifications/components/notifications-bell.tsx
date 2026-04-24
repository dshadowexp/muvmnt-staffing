"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BellIcon, BellOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFcmToken } from "../hooks/use-fcm-token";
import { controlIconButtonClassName } from "@/components/control-trigger";
import { Button } from "@/components/ui/button";

export function NotificationsBell() {
  const tAccount = useTranslations("dashboard.accountMenu");
  const { notificationPermissionStatus, handleEnableNotifications } = useFcmToken();
  const isGranted = notificationPermissionStatus === "granted";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {isGranted ? (
          null
        ) : (
          <Button
            type="button"
            className={controlIconButtonClassName}
            aria-label={tAccount("notifications")}
            onClick={() => handleEnableNotifications(true)}
          >
            <BellOffIcon />
            <span className="sr-only">Request permission</span>
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom">{tAccount("notifications")}</TooltipContent>
    </Tooltip>
  );
}