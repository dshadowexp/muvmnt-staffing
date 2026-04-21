"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BellIcon, BellOffIcon, CircleDashedIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFcmToken } from "../hooks/use-fcm-token";

export function NotificationsBell() {
    const tAccount = useTranslations("dashboard.accountMenu");
    const { notificationPermissionStatus } = useFcmToken();
    const isGranted = notificationPermissionStatus === "granted";

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={tAccount("notifications")}
                >
                    { notificationPermissionStatus === null ? 
                        <CircleDashedIcon className="size-4 animate-spin" /> :
                        isGranted ? <BellIcon className="size-4" /> : <BellOffIcon className="size-4" />}
                </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{tAccount("notifications")}</TooltipContent>
        </Tooltip>
    );
}