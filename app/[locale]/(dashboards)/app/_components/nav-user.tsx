"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { UserAccountDropdownMenuItems } from "@/app/[locale]/app/_components/user-account-dropdown-menu"
import type { UserAccountMenuUser } from "@/app/[locale]/app/_components/user-account-dropdown-menu"
import { UserAvatar } from "@/components/ui/user-avatar"
import { EllipsisVerticalIcon } from "lucide-react"

export function NavUser({
  user,
  accountHref,
  accountLabel,
}: {
  user: UserAccountMenuUser
  accountHref: string
  accountLabel?: string
}) {
  const { isMobile } = useSidebar()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-auto gap-3 rounded-xl border border-transparent px-2.5 py-2 transition-colors hover:border-border/60 hover:bg-muted/70 data-[state=open]:border-border/60 data-[state=open]:bg-muted/80 data-[state=open]:shadow-sm"
            >
              <UserAvatar
                src={user.avatar}
                name={user.name}
                className="h-9 w-9 rounded-lg ring-1 ring-border/60"
                fallbackClassName="rounded-lg text-xs font-semibold"
              />
              <div className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate text-sm font-semibold text-foreground">
                  {user.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <EllipsisVerticalIcon className="ml-auto size-4 shrink-0 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl p-1"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={8}
          >
            <UserAccountDropdownMenuItems
              user={user}
              accountHref={accountHref}
              accountLabel={accountLabel}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
