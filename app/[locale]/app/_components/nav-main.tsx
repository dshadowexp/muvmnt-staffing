"use client"

import { useTranslations } from "next-intl";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link, usePathname } from "@/i18n/navigation";
import {
  resolveActiveNavHref,
  sidebarNavItemClassName,
} from "./sidebar-nav-active";
import { LockIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function NavMain({
  items,
  showQuickActions = false,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    locked?: boolean
  }[]
  showQuickActions?: boolean
}) {
  const pathname = usePathname()
  const t = useTranslations("dashboard.nav")
  const activeHref = resolveActiveNavHref(pathname, items.map((i) => i.url))

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              item.url.startsWith("/") && activeHref === item.url
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  asChild
                  isActive={isActive}
                  className={sidebarNavItemClassName(isActive)}
                >
                  <Link
                    href={item.url}
                    aria-current={isActive ? "page" : undefined}
                    prefetch={true}
                    className={cn(
                      "flex min-w-0 w-full items-center gap-2",
                      item.locked && "opacity-80",
                    )}
                  >
                    {item.icon}
                    <span className="flex-1 truncate">{item.title}</span>
                    {item.locked ? (
                      <LockIcon className="size-3.5 shrink-0 opacity-60" aria-hidden />
                    ) : null}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
