"use client";

import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function InstallPrompt() {
  const t = useTranslations("installPrompt");
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const standalone = window.matchMedia("(display-mode: standalone)").matches;

    setIsIOS(iOS);
    setIsStandalone(standalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    }
  };

  // Don't show if already installed
  if (isStandalone) return null;

  // Chrome/Android/Desktop: only show if the browser fired beforeinstallprompt
  if (!isIOS && !deferredPrompt) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("installApp")}
            onClick={!isIOS ? handleInstallClick : undefined}
          >
            <Download className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-center">
          {isIOS ? (
            <p>{t("iosInstructions")}</p>
          ) : (
            <p>{t("installDevice")}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}