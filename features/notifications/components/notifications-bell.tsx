"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BellIcon, BellOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFcmToken } from "../hooks/use-fcm-token";

export function NotificationsBell() {
    const tAccount = useTranslations("dashboard.accountMenu");
    const { notificationPermissionStatus, handleEnableNotifications } = useFcmToken();
    const isGranted = notificationPermissionStatus === "granted";

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                    {  isGranted ? 
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={tAccount("notifications")}
                    >
                        <BellIcon className="size-4" /> 
                    </Button> : 
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        aria-label={tAccount("notifications")} 
                        onClick={() => handleEnableNotifications(true)}
                    >
                        <BellOffIcon className="size-4" />
                        <span className="sr-only">Request permission</span>
                    </Button>
                    }
                
            </TooltipTrigger>
            <TooltipContent side="bottom">{tAccount("notifications")}</TooltipContent>
        </Tooltip>
    );
}