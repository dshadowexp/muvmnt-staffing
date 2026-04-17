"use client";

import { useTranslations } from "next-intl";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { Link } from "@/i18n/navigation";
import { LogOutIcon, UserIcon } from "lucide-react";

export type UserAccountMenuUser = {
  name: string;
  email: string;
  avatar: string;
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
}

/** Shared body for the user account dropdown (sidebar NavUser + header avatar). */
export function UserAccountDropdownMenuItems({
  user,
  accountHref,
  accountLabel,
}: {
  user: UserAccountMenuUser;
  accountHref: string;
  accountLabel?: string;
}) {
  const t = useTranslations("dashboard.accountMenu");
  const resolvedAccountLabel = accountLabel ?? t("accountLabel");
  const initials = initialsFromName(user.name);

  return (
    <>
      <DropdownMenuLabel className="p-0 font-normal">
        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
          <Avatar className="h-8 w-8 rounded-lg">
            {user.avatar ? (
              <AvatarImage src={user.avatar} alt={user.name} />
            ) : null}
            <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {user.email}
            </span>
          </div>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href={accountHref} className="cursor-pointer">
          <UserIcon className="size-4" />
          {resolvedAccountLabel}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <LogoutButton asChild>
        <DropdownMenuItem className="cursor-pointer">
          <LogOutIcon className="size-4" />
          {t("logout")}
        </DropdownMenuItem>
      </LogoutButton>
    </>
  );
}
