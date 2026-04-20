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
  ListChecksIcon,
  MessageSquareIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
  CheckIcon,
  SquircleDashedIcon,
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
      return "/admin";
    case "worker":
      return "/worker";
    case "client":
      return "/client";
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
      { title: t("home"), url: "/worker", icon: <LayoutDashboardIcon className="size-4" /> },
      { title: t("shifts"), url: "/worker/shifts", icon: <CalendarDays className="size-4" /> },
      { title: t("availability"), url: "/worker/availability", icon: <CalendarClock className="size-4" /> },
      { title: t("assessments"), url: "/worker/assessments", icon: <CheckIcon className="size-4" /> },
      { title: t("compliance"), url: "/worker/compliance", icon: <ShieldCheckIcon className="size-4" /> },
      { title: t("payroll"), url: "/worker/payroll", icon: <WalletIcon className="size-4" /> },
      { title: t("referrals"), url: "/worker/referrals", icon: <GiftIcon className="size-4" /> },
    ];
  }

  if (r === "client") {
    return [
      { title: t("home"), url: "/client", icon: <LayoutDashboardIcon className="size-4" /> },
      { title: t("requests"), url: "/client/requests", icon: <ListChecksIcon className="size-4" /> },
      { title: t("account"), url: "/client/account", icon: <UserIcon className="size-4" /> },
      { title: t("billing"), url: "/client/billing", icon: <CreditCardIcon className="size-4" /> },
      { title: t("referrals"), url: "/client/referrals", icon: <GiftIcon className="size-4" /> },
    ];
  }

  if (r === "admin") {
    return [
      { title: t("dashboardLabel"), url: "/admin", icon: <LayoutDashboardIcon className="size-4" /> },
      { title: t("requests"), url: "/admin/requests", icon: <ListChecksIcon className="size-4" /> },
      { title: t("shifts"), url: "/admin/shifts", icon: <CalendarDays className="size-4" /> },
      { title: t("authorization"), url: "/admin/authorization", icon: <BadgeCheckIcon className="size-4" /> },
      { title: t("compliance"), url: "/admin/compliance", icon: <ShieldCheckIcon className="size-4" /> },
      { title: t("clients"), url: "/admin/clients", icon: <Building2Icon className="size-4" /> },
      { title: t("workers"), url: "/admin/workers", icon: <UsersIcon className="size-4" /> },
      { title: t("referrals"), url: "/admin/referrals", icon: <GiftIcon className="size-4" /> },
    ];
  }

  return [];
}

export function AppSidebar({
  admin,
  ...props
}: React.ComponentProps<typeof Sidebar> & { admin?: { user: AppSidebarAdminUser } }) {
  const { authUser, firebaseUser, loading } = useAuth();
  const tNav = useTranslations("dashboard.nav");
  const tAccount = useTranslations("dashboard.accountMenu");

  const role = admin ? "admin" : authUser?.role ?? null;
  const navMain = useMainNavItems(role);
  const homeHref = homeHrefForRole(role);
  const accountHref = dashboardAccountHrefForRole(role);
  const accountLabel = tAccount(dashboardAccountLabelKeyForRole(role));
  const isClientOrWorker = role?.toLowerCase() === "client" || role?.toLowerCase() === "worker";
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);

  const user =
    admin != null
      ? {
          name: admin.user.name,
          email: admin.user.email,
          avatar: admin.user.avatar ?? "",
        }
      : {
          name: firebaseUser?.displayName?.trim() || tAccount("defaultName"),
          email: firebaseUser?.email ?? "",
          avatar: firebaseUser?.photoURL ?? "",
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
        {loading && !admin ? <SquircleDashedIcon /> : <NavMain items={navMain} />}
      </SidebarContent>
      <SidebarFooter className="gap-2">
        {isClientOrWorker ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={tNav("feedback")}
                onClick={() => setFeedbackOpen(true)}
              >
                <MessageSquareIcon className="size-4" />
                <span>{tNav("feedback")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : null}
        <NavUser
          user={user}
          accountHref={accountHref}
          accountLabel={accountLabel}
        />
      </SidebarFooter>
      {isClientOrWorker && (
        <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      )}
    </Sidebar>
  );
}
