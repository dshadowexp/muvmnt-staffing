"use client";

import { useTranslations } from "next-intl";
import {
  dashboardAccountHrefForRole,
  dashboardAccountLabelKeyForRole,
} from "@/app/[locale]/dashboard/_components/dashboard-account";
import {
  UserAccountDropdownMenuItems,
  type UserAccountMenuUser,
} from "@/app/[locale]/dashboard/_components/user-account-dropdown-menu";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { NotificationsBell } from "@/features/notifications/components/notifications-bell";
import { InstallPrompt } from "@/features/notifications/components/install-prompt";
import { FeedbackIcon } from "@/features/feedback/components/feedback-icon";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
}

type SiteHeaderProps = {
  /** When set (e.g. admin shell), overrides Firebase user for this menu + avatar. */
  menuUser?: UserAccountMenuUser;
};

export function SiteHeader({ menuUser: menuUserProp }: SiteHeaderProps = {}) {
  const { authUser, firebaseUser, loading } = useAuth();
  const tAccount = useTranslations("dashboard.accountMenu");
  const role = authUser?.role ?? null;
  const accountHref = dashboardAccountHrefForRole(role);
  const accountLabel = tAccount(dashboardAccountLabelKeyForRole(role));

  const menuUser: UserAccountMenuUser =
    menuUserProp ??
    ({
      name: firebaseUser?.displayName?.trim() || tAccount("defaultName"),
      email: firebaseUser?.email ?? "",
      avatar: firebaseUser?.photoURL ?? "",
    } satisfies UserAccountMenuUser);

  const initials = initialsFromName(menuUser.name);

  return (
    <header className="sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center gap-2 border-b border-border/20 bg-transparent backdrop-blur-xl supports-[backdrop-filter]:bg-background/[0.04] dark:supports-[backdrop-filter]:bg-background/[0.08]">
      <div className="flex w-full min-w-0 items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <Separator
            orientation="vertical"
            className="mx-2 shrink-0 data-[orientation=vertical]:h-4"
          />
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <InstallPrompt />
          <NotificationsBell />
          <FeedbackIcon />
          <LanguageSwitcher variant="ghost" />
          <ThemeToggle />
          <Separator
            orientation="vertical"
            className="mx-1.5 shrink-0 data-[orientation=vertical]:h-4"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 rounded-full p-0"
                aria-label={tAccount("accountMenuAria")}
                disabled={loading && !menuUserProp}
              >
                <Avatar className="size-8 rounded-full">
                  {menuUser.avatar ? (
                    <AvatarImage src={menuUser.avatar} alt={menuUser.name} />
                  ) : null}
                  <AvatarFallback className="rounded-full text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="min-w-56 rounded-lg"
              side="bottom"
              align="end"
              sideOffset={8}
            >
              <UserAccountDropdownMenuItems
                user={menuUser}
                accountHref={accountHref}
                accountLabel={accountLabel}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
