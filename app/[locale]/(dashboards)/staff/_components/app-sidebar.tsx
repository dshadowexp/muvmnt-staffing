"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  CalendarClock,
  CalendarDays,
  GiftIcon,
  LayoutDashboardIcon,
  ShieldCheckIcon,
  WalletIcon,
} from "lucide-react";
import { isPayrollSectionUnlocked } from "@/features/staff/lib/worker-stage-order";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { NavUser } from "./nav-user";
import { NavMain } from "./nav-main";

export type AppSidebarAdminUser = {
  name: string;
  email: string;
  avatar?: string;
};

type NavItem = { title: string; url: string; icon: React.ReactNode; locked?: boolean };

function useMainNavItems(
  workerStage: string | null | undefined,
): NavItem[] {
  const t = useTranslations("dashboard.nav");

  const payrollLocked = !isPayrollSectionUnlocked(workerStage);
  return [
    { title: t("home"), url: "/staff", icon: <LayoutDashboardIcon className="size-4" /> },
    { title: t("shifts"), url: "/staff/shifts", icon: <CalendarDays className="size-4" /> },
    { title: t("availability"), url: "/staff/availability", icon: <CalendarClock className="size-4" /> },
    { title: t("compliance"), url: "/staff/compliance", icon: <ShieldCheckIcon className="size-4" /> },
    {
      title: t("payroll"),
      url: "/staff/payroll",
      icon: <WalletIcon className="size-4" />,
      locked: payrollLocked,
    },
    { title: t("referrals"), url: "/staff/referrals", icon: <GiftIcon className="size-4" /> },
  ];
}

export function AppSidebar({
  avatarSrc,
  displayName,
  workerStage,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  avatarSrc?: string | null;
  displayName?: string | null;
  /** Worker lifecycle stage — used to show payroll lock in nav before payroll step. */
  workerStage?: string | null;
}) {
  const { firebaseUser } = useAuth();
  const tAccount = useTranslations("dashboard.accountMenu");

  const navMain = useMainNavItems(workerStage);
  const homeHref = "/staff";
  const accountHref = "/staff/profile";
  const accountLabel = tAccount("accountLabel");

  const user = {
    name: displayName ?? tAccount("defaultName"),
    email: firebaseUser?.email ?? "",
    avatar: avatarSrc ?? firebaseUser?.photoURL ?? "",
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Logo href={homeHref} />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter className="gap-2">
        <NavUser
          user={user}
          accountHref={accountHref}
          accountLabel={accountLabel}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
