"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/logo";
import { NavMain } from "@/app/[locale]/dashboard/_components/nav-main";
import { NavUser } from "@/app/[locale]/dashboard/_components/nav-user";
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
  BadgeCheckIcon,
  Building2Icon,
  CalendarClock,
  CalendarDays,
  CreditCardIcon,
  GiftIcon,
  LayoutDashboardIcon,
  ScanSearchIcon,
  MessageSquareIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
  CheckIcon,
  CircleDashedIcon,
  VideoIcon,
} from "lucide-react";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { FeedbackDialog } from "@/features/feedback/components/feedback-dialog";
import {
  dashboardAccountHrefForRole,
  dashboardAccountLabelKeyForRole,
} from "@/app/[locale]/dashboard/_components/dashboard-account";

export type AppSidebarAdminUser = {
  name: string;
  email: string;
  avatar?: string;
};

function homeHrefForRole(role: string | null | undefined): string {
  switch (role?.toLowerCase()) {
    case "admin":
    case "worker":
    case "client":
      return "/dashboard";
    default:
      return "/";
  }
}

type NavItem = { title: string; url: string; icon: React.ReactNode };

function useMainNavItems(role: string | null | undefined): NavItem[] {
  const t = useTranslations("dashboard.nav");
  const r = role?.toLowerCase() ?? "";

  if (r === "worker") {
    return [
      { title: t("home"), url: "/dashboard", icon: <LayoutDashboardIcon className="size-4" /> },
      { title: t("shifts"), url: "/dashboard/shifts", icon: <CalendarDays className="size-4" /> },
      { title: t("availability"), url: "/dashboard/availability", icon: <CalendarClock className="size-4" /> },
      { title: t("assessments"), url: "/dashboard/assessments", icon: <CheckIcon className="size-4" /> },
      { title: t("compliance"), url: "/dashboard/compliance", icon: <ShieldCheckIcon className="size-4" /> },
      { title: t("payroll"), url: "/dashboard/payroll", icon: <WalletIcon className="size-4" /> },
      { title: t("referrals"), url: "/dashboard/referrals", icon: <GiftIcon className="size-4" /> },
    ];
  }

  if (r === "client") {
    return [
      { title: t("home"), url: "/dashboard", icon: <LayoutDashboardIcon className="size-4" /> },
      { title: t("requests"), url: "/dashboard/requests", icon: <ScanSearchIcon className="size-4" /> },
      { title: t("account"), url: "/dashboard/account", icon: <UserIcon className="size-4" /> },
      { title: t("referrals"), url: "/dashboard/referrals", icon: <GiftIcon className="size-4" /> },
    ];
  }

  if (r === "admin") {
    return [
      { title: t("dashboardLabel"), url: "/dashboard/admin", icon: <LayoutDashboardIcon className="size-4" /> },
      { title: t("requests"), url: "/dashboard/admin/requests", icon: <ScanSearchIcon className="size-4" /> },
      { title: t("shifts"), url: "/dashboard/admin/shifts", icon: <CalendarDays className="size-4" /> },
      { title: t("authorization"), url: "/dashboard/admin/authorization", icon: <BadgeCheckIcon className="size-4" /> },
      { title: t("compliance"), url: "/dashboard/admin/compliance", icon: <ShieldCheckIcon className="size-4" /> },
      { title: t("interviews"), url: "/dashboard/admin/interviews", icon: <VideoIcon className="size-4" /> },
      { title: t("clients"), url: "/dashboard/admin/clients", icon: <Building2Icon className="size-4" /> },
      { title: t("workers"), url: "/dashboard/admin/workers", icon: <UsersIcon className="size-4" /> },
      { title: t("referrals"), url: "/dashboard/referrals", icon: <GiftIcon className="size-4" /> },
    ];
  }

  return [];
}

export function AppSidebar({
  admin,
  avatarSrc,
  displayName,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  admin?: { user: AppSidebarAdminUser };
  avatarSrc?: string | null;
  displayName?: string | null;
}) {
  const { authUser, firebaseUser, loading } = useAuth();
  const tAccount = useTranslations("dashboard.accountMenu");

  const role = admin ? "admin" : authUser?.role ?? null;
  const navMain = useMainNavItems(role);
  const homeHref = homeHrefForRole(role);
  const accountHref = dashboardAccountHrefForRole(role);
  const accountLabel = tAccount(dashboardAccountLabelKeyForRole(role));

  const user =
    admin != null
      ? {
          name: admin.user.name,
          email: admin.user.email,
          avatar: admin.user.avatar ?? "",
        }
      : {
          name: displayName ?? firebaseUser?.displayName?.trim() ?? tAccount("defaultName"),
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
        {loading && !admin ? <CircleDashedIcon className="size-4 animate-spin" /> : <NavMain items={navMain} />}
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
