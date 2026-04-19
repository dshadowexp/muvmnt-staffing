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

export function NavMain({
  items,
  showQuickActions = false,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
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
                  <Link href={item.url} aria-current={isActive ? "page" : undefined} prefetch={true}>
                    {item.icon}
                    <span>{item.title}</span>
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
