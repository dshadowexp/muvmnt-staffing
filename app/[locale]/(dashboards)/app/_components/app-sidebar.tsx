"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  LayoutDashboardIcon,
  WalletIcon,
  UserRoundSearchIcon,
  FingerprintIcon,
  Columns3CogIcon,
} from "lucide-react";
import { NavFacility } from "./nav-facility";

type NavItem = { title: string; url: string; icon: React.ReactNode; locked?: boolean };

function useMainNavItems(): NavItem[] {
  const t = useTranslations("dashboard.nav");

  return [
    { title: t("home"), url: "/app", icon: <LayoutDashboardIcon className="size-4" /> },
    { title: t("requests"), url: "/app/requests", icon: <UserRoundSearchIcon className="size-4" /> },
    { title: t("screenings"), url: "/app/screenings", icon: <FingerprintIcon className="size-4" /> },
    { title: t("billing"), url: "/app/billing", icon: <WalletIcon className="size-4" /> },
    { title: t("account"), url: "/app/account", icon: <Columns3CogIcon className="size-4" /> },
  ];
}

export function AppSidebar() {
  const navMain = useMainNavItems();

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <NavFacility />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter className="gap-2">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
