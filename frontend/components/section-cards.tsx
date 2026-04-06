"use client"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  BriefcaseIcon,
  Building2Icon,
  TrendingDownIcon,
  TrendingUpIcon,
  UserSquareIcon,
  UsersIcon,
} from "lucide-react"

const gridClass =
  "grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card"

export type SectionCardsMetrics = {
  users: number
  workers: number
  clients: number
  jobPostings: number
}

export function SectionCards({ metrics }: { metrics?: SectionCardsMetrics }) {
  if (metrics) {
    const cards = [
      {
        label: "Users",
        value: metrics.users,
        hint: "Registered accounts on the platform",
        Icon: UsersIcon,
      },
      {
        label: "Workers",
        value: metrics.workers,
        hint: "Professional profiles",
        Icon: UserSquareIcon,
      },
      {
        label: "Clients",
        value: metrics.clients,
        hint: "Organizations",
        Icon: Building2Icon,
      },
      {
        label: "Job postings",
        value: metrics.jobPostings,
        hint: "Open staff requests",
        Icon: BriefcaseIcon,
      },
    ] as const

    return (
      <div className={gridClass}>
        {cards.map(({ label, value, hint, Icon }) => (
          <Card key={label} className="@container/card">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardDescription>{label}</CardDescription>
                <Icon className="text-muted-foreground size-4 shrink-0" />
              </div>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {value.toLocaleString()}
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className="text-muted-foreground">
                  Live
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="text-muted-foreground text-sm">{hint}</CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className={gridClass}>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Revenue</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            $1,250.00
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUpIcon
              />
              +12.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Trending up this month{" "}
            <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Visitors for the last 6 months
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>New Customers</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            1,234
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingDownIcon
              />
              -20%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Down 20% this period{" "}
            <TrendingDownIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Acquisition needs attention
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Accounts</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            45,678
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUpIcon
              />
              +12.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Strong user retention{" "}
            <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">Engagement exceed targets</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Growth Rate</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            4.5%
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUpIcon
              />
              +4.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Steady performance increase{" "}
            <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">Meets growth projections</div>
        </CardFooter>
      </Card>
    </div>
  )
}

