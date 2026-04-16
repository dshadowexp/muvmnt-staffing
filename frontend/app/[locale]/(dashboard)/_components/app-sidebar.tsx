"use client";

import * as React from "react";
import { Logo } from "@/components/logo";
import { NavMain } from "@/app/[locale]/(dashboard)/_components/nav-main";
import { NavSecondary } from "@/app/[locale]/(dashboard)/_components/nav-secondary";
import { NavUser } from "@/app/[locale]/(dashboard)/_components/nav-user";
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
  ChartBarIcon,
  CircleHelpIcon,
  CreditCardIcon,
  FolderIcon,
  GiftIcon,
  LayoutDashboardIcon,
  ListIcon,
  SearchIcon,
  Settings2Icon,
  UserIcon,
  UsersIcon,
  WalletIcon,
  CheckIcon,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { useAuth } from "@/providers/auth-provider";
import {
  dashboardAccountHrefForRole,
  dashboardAccountLabelForRole,
} from "@/app/[locale]/(dashboard)/_components/dashboard-account";
import {
  resolveActiveNavHref,
  sidebarNavItemClassName,
} from "./sidebar-nav-active";

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

function mainNavItems(role: string | null | undefined): {
  title: string;
  url: string;
  icon: React.ReactNode;
}[] {
  const r = role?.toLowerCase() ?? "";

  if (r === "worker") {
    return [
      {
        title: "Home",
        url: "/worker",
        icon: <LayoutDashboardIcon className="size-4" />,
      },
      {
        title: "Shifts",
        url: "/worker/shifts",
        icon: <CalendarDays className="size-4" />,
      },
      {
        title: "Availability",
        url: "/worker/availability",
        icon: <CalendarClock className="size-4" />,
      },
      {
        title: "Assessments",
        url: "/worker/assessments",
        icon: <CheckIcon className="size-4" />,
      },
      {
        title: "Payroll",
        url: "/worker/payroll",
        icon: <WalletIcon className="size-4" />,
      },
    ];
  }

  if (r === "client") {
    return [
      {
        title: "Home",
        url: "/client",
        icon: <LayoutDashboardIcon className="size-4" />,
      },
      {
        title: "Shifts",
        url: "/client/shifts",
        icon: <CalendarDays className="size-4" />,
      },
      {
        title: "Account",
        url: "/client/account",
        icon: <UserIcon className="size-4" />,
      },
      {
        title: "Billing",
        url: "/client/billing",
        icon: <CreditCardIcon className="size-4" />,
      },
    ];
  }

  if (r === "admin") {
    return [
      {
        title: "Dashboard",
        url: "/admin",
        icon: <LayoutDashboardIcon className="size-4" />,
      },
      {
        title: "Lifecycle",
        url: "/admin/workers",
        icon: <ListIcon className="size-4" />,
      },
      {
        title: "Analytics",
        url: "/admin/clients",
        icon: <ChartBarIcon className="size-4" />,
      },
      {
        title: "Projects",
        url: "/admin/requests",
        icon: <FolderIcon className="size-4" />,
      },
      {
        title: "Team",
        url: "/admin/workers",
        icon: <UsersIcon className="size-4" />,
      },
    ];
  }

  return [];
}

function secondaryNavItems(role: string | null | undefined): {
  title: string;
  url: string;
  icon: React.ReactNode;
}[] {
  if (role?.toLowerCase() !== "admin") return [];
  return [
    {
      title: "Settings",
      url: "#",
      icon: <Settings2Icon className="size-4" />,
    },
    {
      title: "Get Help",
      url: "#",
      icon: <CircleHelpIcon className="size-4" />,
    },
    {
      title: "Search",
      url: "#",
      icon: <SearchIcon className="size-4" />,
    },
  ];
}

export function AppSidebar({
  admin,
  ...props
}: React.ComponentProps<typeof Sidebar> & { admin?: { user: AppSidebarAdminUser } }) {
  const { authUser, firebaseUser, loading } = useAuth();
  const pathname = usePathname();

  const role = admin ? "admin" : authUser?.role ?? null;
  const navMain = mainNavItems(role);
  const navSecondary = secondaryNavItems(role);
  const homeHref = homeHrefForRole(role);
  const accountHref = dashboardAccountHrefForRole(role);
  const accountLabel = dashboardAccountLabelForRole(role);
  const referHref =
    role?.toLowerCase() === "client"
      ? "/client/referrals"
      : role?.toLowerCase() === "worker"
        ? "/worker/referrals"
        : null;
  const referActive =
    referHref != null &&
    resolveActiveNavHref(pathname, [referHref]) === referHref;

  const user =
    admin != null
      ? {
          name: admin.user.name,
          email: admin.user.email,
          avatar: admin.user.avatar ?? "",
        }
      : {
          name: firebaseUser?.displayName?.trim() || "Account",
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
        {loading && !admin ? (
          <div className="text-muted-foreground px-2 py-4 text-sm">Loading…</div>
        ) : (
          <NavMain items={navMain} showQuickActions={false} />
        )}
        {navSecondary.length > 0 ? (
          <NavSecondary items={navSecondary} className="mt-auto" />
        ) : null}
      </SidebarContent>
      <SidebarFooter className="gap-2">
        {referHref ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={referActive}
                tooltip="Refer and earn"
                className={sidebarNavItemClassName(referActive)}
              >
                <Link
                  href={referHref}
                  aria-current={referActive ? "page" : undefined}
                  prefetch={true}
                >
                  <GiftIcon className="size-4" />
                  <span>Refer and earn</span>
                </Link>
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
    </Sidebar>
  );
}
