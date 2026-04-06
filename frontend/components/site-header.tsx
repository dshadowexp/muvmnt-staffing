"use client"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { usePathname } from "@/i18n/navigation"

function titleFromPath(pathname: string) {
  const seg = pathname.split("/").filter(Boolean)
  const last = seg[seg.length - 1] ?? ""
  if (seg[0] === "admin" && seg[1] === "workers" && seg.length > 2) {
    return "Worker review"
  }
  if (last === "workers") return "Workers"
  if (last === "clients") return "Clients"
  if (last === "jobs") return "Job postings"
  if (last === "admin") return "Dashboard"
  return "Documents"
}

export function SiteHeader({ title }: { title?: string }) {
  const pathname = usePathname()
  const heading = title ?? titleFromPath(pathname)

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{heading}</h1>
      </div>
    </header>
  )
}
