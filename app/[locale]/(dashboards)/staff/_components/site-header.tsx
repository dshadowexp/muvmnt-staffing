"use client";

import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { NotificationsBell } from "@/features/notifications/components/notifications-bell";
import { FeedbackIcon } from "@/features/feedback/components/feedback-icon";
import { controlIconButtonClassName } from "@/components/control-trigger";
import { UserAccountDropdownMenuItems, UserAccountMenuUser } from "./user-account-dropdown-menu";

type SiteHeaderProps = {
  /** When set (e.g. admin shell), overrides Firebase user for this menu + avatar. */
  menuUser?: UserAccountMenuUser;
  /** Resolved avatar URL (e.g. presigned S3 URL for workers). Takes precedence over Firebase photoURL. */
  avatarSrc?: string | null;
  displayName?: string | null;  
};

export function SiteHeader({ menuUser: menuUserProp, avatarSrc, displayName }: SiteHeaderProps = {}) {
  const { firebaseUser, loading } = useAuth();
  const tAccount = useTranslations("dashboard.accountMenu");
  const accountHref = "/staff/profile";
  const accountLabel = tAccount("accountLabel");

  const menuUser: UserAccountMenuUser =
    menuUserProp ??
    ({
      name: displayName ?? firebaseUser?.displayName?.trim() ?? tAccount("defaultName"),
      email: firebaseUser?.email ?? "",
      avatar: avatarSrc ?? firebaseUser?.photoURL ?? "",
    } satisfies UserAccountMenuUser);

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
        <div className="flex shrink-0 items-center gap-1.5">
          <NotificationsBell />
          <FeedbackIcon />
          <LanguageSwitcher />
          <ThemeToggle />
          <Separator
            orientation="vertical"
            className="mx-1 shrink-0 data-[orientation=vertical]:h-5"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`${controlIconButtonClassName} overflow-hidden p-0`}
                aria-label={tAccount("accountMenuAria")}
                disabled={loading && !menuUserProp}
              >
                <UserAvatar
                  src={menuUser.avatar}
                  name={menuUser.name}
                  className="size-[34px] rounded-full"
                  fallbackClassName="rounded-full text-[11px] font-semibold"
                />
              </button>
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
