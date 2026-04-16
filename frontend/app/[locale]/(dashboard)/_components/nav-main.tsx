"use client"

import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Link, usePathname } from "@/i18n/navigation"
import { CirclePlusIcon, MailIcon } from "lucide-react"
import {
  resolveActiveNavHref,
  sidebarNavItemClassName,
} from "./sidebar-nav-active"

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
  const activeHref = resolveActiveNavHref(pathname, items.map((i) => i.url))

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        {showQuickActions ? (
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center gap-2">
              <SidebarMenuButton
                tooltip="Quick Create"
                className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
              >
                <CirclePlusIcon />
                <span>Quick Create</span>
              </SidebarMenuButton>
              <Button
                size="icon"
                className="size-8 group-data-[collapsible=icon]:opacity-0"
                variant="outline"
              >
                <MailIcon />
                <span className="sr-only">Inbox</span>
              </Button>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : null}
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
                  {item.url.startsWith("/") ? (
                    <Link href={item.url} aria-current={isActive ? "page" : undefined} prefetch={true}>
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
