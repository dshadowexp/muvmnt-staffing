"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { getOperatorFacilityNameAction } from "@/features/account/actions";
import { Building2Icon, CrossIcon } from "lucide-react";


export function NavFacility() {
  const { authUser, loading: authLoading } = useAuth();
  const t = useTranslations("dashboard.nav");
  const [resolved, setResolved] = useState(false);
  const [facilityName, setFacilityName] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!authUser?.facilityId) {
      setFacilityName(null);
      setResolved(true);
      return;
    }

    setResolved(false);
    let cancelled = false;

    void getOperatorFacilityNameAction().then(({ name }) => {
      if (!cancelled) {
        setFacilityName(name);
        setResolved(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, authUser?.facilityId]);

  const showSkeleton = authLoading || (Boolean(authUser?.facilityId) && !resolved);
  const label = facilityName?.trim() || t("facilityFallback");

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {showSkeleton ? (
            <SidebarMenuButton
                size="lg"
                disabled
                className="pointer-events-none data-[slot=sidebar-menu-button]:p-1.5!"
            >
                <Building2Icon className="size-5!" />
                <Skeleton className="h-4 min-w-0 flex-1 max-w-[10rem]" />
            </SidebarMenuButton>
        ) : (
            <SidebarMenuButton
                asChild
                size="lg"
                className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
                <Link href="/app" title={label}>
                    <Building2Icon className="size-5!" />
                    <span className="truncate text-base font-semibold">{label}</span>
                </Link>
            </SidebarMenuButton>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
