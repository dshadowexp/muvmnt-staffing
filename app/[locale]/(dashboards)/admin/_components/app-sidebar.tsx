"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  BadgeCheckIcon,
  Building2Icon,
  CalendarDays,
  LayoutDashboardIcon,
  ScanSearchIcon,
  ShieldCheckIcon,
  UserCogIcon,
  UsersIcon,
  VideoIcon,
} from "lucide-react";
import { useAuth } from "@/features/auth/providers/auth-provider";


export type AppSidebarAdminUser = {
  name: string;
  email: string;
  avatar?: string;
};

type NavItem = { title: string; url: string; icon: React.ReactNode; locked?: boolean };

function useMainNavItems(): NavItem[] {
  const t = useTranslations("dashboard.nav");

  return [
    { title: t("dashboardLabel"), url: "/admin", icon: <LayoutDashboardIcon className="size-4" /> },
    { title: t("requests"), url: "/admin/requests", icon: <ScanSearchIcon className="size-4" /> },
    { title: t("shifts"), url: "/admin/shifts", icon: <CalendarDays className="size-4" /> },
    { title: t("authorization"), url: "/admin/authorization", icon: <BadgeCheckIcon className="size-4" /> },
    { title: t("compliance"), url: "/admin/compliance", icon: <ShieldCheckIcon className="size-4" /> },
    { title: t("interviews"), url: "/admin/interviews", icon: <VideoIcon className="size-4" /> },
    { title: t("facilities"), url: "/admin/facilities", icon: <Building2Icon className="size-4" /> },
    { title: t("operators"), url: "/admin/operators", icon: <UserCogIcon className="size-4" /> },
    { title: t("workers"), url: "/admin/workers", icon: <UsersIcon className="size-4" /> },
  ];
}

export function AppSidebar() {
  const { firebaseUser } = useAuth();
  const tAccount = useTranslations("dashboard.accountMenu");

  const navMain = useMainNavItems();
  const accountHref = "/admin/account";
  const accountLabel = tAccount("accountLabel");

  const user = {
    name: firebaseUser?.displayName?.trim() ?? tAccount("defaultName"),
    email: firebaseUser?.email ?? "",
    avatar: firebaseUser?.photoURL ?? "",
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <NavUser
              user={user}
              accountHref={accountHref}
              accountLabel={accountLabel}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
    </Sidebar>
  );
}
