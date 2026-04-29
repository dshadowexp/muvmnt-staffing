"use client";

import type { ReactNode } from "react";
import { ExternalLinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { PricingTiers } from "@/features/billing/components/pricing-tiers";
import type { SubscriptionPlan } from "@/services/stripe/server";
import { cn } from "@/lib/utils";

type BillingPricingDrawerProps = {
  facilityName: string | null;
  currentPlan?: SubscriptionPlan | null;
  trigger: ReactNode;
};

export function BillingPricingDrawer({
  facilityName,
  currentPlan,
  trigger,
}: BillingPricingDrawerProps) {
  const t = useTranslations("dashboard.client.billing");
  const displayName = facilityName?.trim() || t("drawerFacilityFallback");

  return (
    <Drawer direction="right" repositionInputs={false}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent
        className={cn(
          "left-auto right-0 top-0 mt-0 flex h-[100dvh] max-h-none flex-col rounded-none border-l bg-background",
          "data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-4xl data-[vaul-drawer-direction=right]:sm:max-w-4xl",
        )}
      >
        <DrawerHeader className="shrink-0 gap-3 border-b px-4 pb-4 pt-4 text-left">
          <div className="flex items-start justify-between gap-3">
            <DrawerTitle className="text-left text-base font-semibold leading-snug">
              {t("drawerTitle", { facilityName: displayName })}
            </DrawerTitle>
            <Button variant="outline" size="sm" className="shrink-0 gap-1.5" asChild>
              <Link href="/pricing">
                <span>{t("pricingPageLink")}</span>
                <ExternalLinkIcon className="size-3.5 opacity-70" aria-hidden />
              </Link>
            </Button>
          </div>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4">
          <PricingTiers currentPlan={currentPlan ?? undefined} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
