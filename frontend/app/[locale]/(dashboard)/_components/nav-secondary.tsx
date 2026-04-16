"use client"

import * as React from "react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Link, usePathname } from "@/i18n/navigation"
import {
  resolveActiveNavHref,
  sidebarNavItemClassName,
} from "./sidebar-nav-active"

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: React.ReactNode
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const pathname = usePathname()
  const routable = items.map((i) => i.url).filter((u) => u.startsWith("/"))
  const activeHref =
    routable.length > 0 ? resolveActiveNavHref(pathname, routable) : null

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              item.url.startsWith("/") && activeHref === item.url
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className={sidebarNavItemClassName(isActive)}
                >
                  {item.url.startsWith("/") ? (
                    <Link
                      href={item.url}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {item.icon}
                      <span>{item.title}</span>
                    </Link>
                  ) : (
                    <a href={item.url}>
                      {item.icon}
                      <span>{item.title}</span>
                    </a>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
