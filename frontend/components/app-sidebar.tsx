"use client"

import * as React from "react"

import { AdminNavUser } from "@/components/admin/admin-nav-user"
import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { SITE_NAME } from "@/lib/constants"
import { Link, usePathname } from "@/i18n/navigation"
import {
  BriefcaseIcon,
  Building2Icon,
  ChartBarIcon,
  CommandIcon,
  DatabaseIcon,
  FileChartColumnIcon,
  FileIcon,
  FolderIcon,
  HomeIcon,
  LayoutDashboardIcon,
  ListIcon,
  SearchIcon,
  Settings2Icon,
  CircleHelpIcon,
  UserSquareIcon,
  UsersIcon,
} from "lucide-react"

const demoData = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Lifecycle",
      url: "#",
      icon: <ListIcon />,
    },
    {
      title: "Analytics",
      url: "#",
      icon: <ChartBarIcon />,
    },
    {
      title: "Projects",
      url: "#",
      icon: <FolderIcon />,
    },
    {
      title: "Team",
      url: "#",
      icon: <UsersIcon />,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: <Settings2Icon />,
    },
    {
      title: "Get Help",
      url: "#",
      icon: <CircleHelpIcon />,
    },
    {
      title: "Search",
      url: "#",
      icon: <SearchIcon />,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: <DatabaseIcon />,
    },
    {
      name: "Reports",
      url: "#",
      icon: <FileChartColumnIcon />,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: <FileIcon />,
    },
  ],
}

const adminNav = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboardIcon },
  { title: "Workers", href: "/admin/workers", icon: UserSquareIcon },
  { title: "Clients", href: "/admin/clients", icon: Building2Icon },
  { title: "Job postings", href: "/admin/jobs", icon: BriefcaseIcon },
] as const

function adminPathActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin" || pathname === "/admin/"
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export type AppSidebarAdminProps = {
  user: { name: string; email: string; avatar?: string }
}

export function AppSidebar({
  admin,
  ...props
}: React.ComponentProps<typeof Sidebar> & { admin?: AppSidebarAdminProps }) {
  const pathname = usePathname()

  if (admin) {
    return (
      <Sidebar collapsible="offcanvas" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="data-[slot=sidebar-menu-button]:p-1.5!"
              >
                <Link href="/admin">
                  <CommandIcon className="size-5!" />
                  <span className="text-base font-semibold">{SITE_NAME}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNav.map(({ title, href, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      tooltip={title}
                      isActive={adminPathActive(pathname, href)}
                    >
                      <Link href={href}>
                        <Icon />
                        <span>{title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <NavSecondary
            className="mt-auto"
            items={[
              {
                title: "Back to app",
                url: "/app",
                icon: <HomeIcon />,
              },
            ]}
          />
        </SidebarContent>
        <SidebarFooter>
          <AdminNavUser user={admin.user} />
        </SidebarFooter>
      </Sidebar>
    )
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="#">
                <CommandIcon className="size-5!" />
                <span className="text-base font-semibold">Acme Inc.</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={demoData.navMain} />
        <NavDocuments items={demoData.documents} />
        <NavSecondary items={demoData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={demoData.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
