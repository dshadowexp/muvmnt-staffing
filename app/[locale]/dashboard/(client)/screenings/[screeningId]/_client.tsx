"use client"

import { useState } from "react"
import { Link, useRouter } from "@/i18n/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  CircleDashedIcon,
  MailIcon,
  PauseIcon,
  PlayIcon,
  XCircleIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  PencilIcon,
  MousePointerClickIcon,
  UsersIcon,
  SendIcon,
  BarChart2Icon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Field, FieldError } from "@/components/ui/field"
import type {
  ScreeningRow,
  ScreeningInviteRow,
  CandidateWithResult,
} from "@/features/screenings/dal/queries"
import {
  updateScreeningStatusAction,
  sendScreeningInviteAction,
} from "@/features/screenings/actions"
import { cn } from "@/lib/utils"
import { BackLink } from "@/components/back-link"

type Props = {
  screening: ScreeningRow
  invites: ScreeningInviteRow[]
  candidates: CandidateWithResult[]
}

// ─── Stats row ────────────────────────────────────────────────────────────────

function StatsRow({
  candidates,
  invites,
}: {
  candidates: CandidateWithResult[]
  invites: ScreeningInviteRow[]
}) {
  const now = Date.now()
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

  const recentCount = candidates.filter(
    (c) => new Date(c.created_at).getTime() >= sevenDaysAgo
  ).length

  const pendingInvites = invites.filter((i) => i.status === "sent").length

  const completedCount = candidates.filter(
    (c) => c.stage === "completed"
  ).length
  const total = candidates.length
  const rate = total > 0 ? Math.round((completedCount / total) * 100) : 0

  const stats = [
    {
      icon: UsersIcon,
      label: "Total Candidates",
      value: total,
      subtext:
        recentCount > 0
          ? `+${recentCount} in the last 7 days`
          : "None added recently",
    },
    {
      icon: SendIcon,
      label: "Interviews Sent",
      value: invites.length,
      subtext:
        pendingInvites === 1
          ? "1 pending response"
          : `${pendingInvites} pending response${pendingInvites !== 1 ? "s" : ""}`,
    },
    {
      icon: BarChart2Icon,
      label: "Screening Rate",
      value: `${rate}%`,
      subtext:
        total === 0
          ? "No candidates yet"
          : `${completedCount} of ${total} interview${total !== 1 ? "s" : ""} complete`,
    },
  ] as const

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map(({ icon: Icon, label, value, subtext }) => (
        <Card key={label} className="rounded-xl">
          <CardContent className="flex flex-col gap-1 p-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Icon className="size-3.5 shrink-0" />
              {label}
            </div>
            <p className="font-[var(--font-display)] text-2xl font-bold tracking-tight text-foreground">
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{subtext}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Invite form schema ───────────────────────────────────────────────────────

const inviteSchema = z.object({
  emails: z
    .string()
    .min(1, "Enter at least one email address")
    .transform((val) =>
      val
        .split(/[\s,]+/)
        .map((e) => e.trim())
        .filter(Boolean)
    )
    .pipe(
      z
        .array(z.string().email("One or more email addresses are invalid"))
        .min(1, "Enter at least one email address")
    ),
})

type InviteValues = z.input<typeof inviteSchema>
type InviteParsedValues = z.output<typeof inviteSchema>

// ─── Main component ───────────────────────────────────────────────────────────

export function ScreeningDetailClient({
  screening,
  invites,
  candidates,
}: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<"active" | "paused" | "closed">(
    screening.status === "active" ||
      screening.status === "paused" ||
      screening.status === "closed"
      ? screening.status
      : "paused"
  )
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)

  const isActive = status === "active"
  const isClosed = status === "closed"

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting: isSendingInvite },
  } = useForm<InviteValues, unknown, InviteParsedValues>({
    defaultValues: { emails: "" },
    resolver: zodResolver(inviteSchema),
  })

  async function handleStatusChange(next: "active" | "paused" | "closed") {
    setIsUpdatingStatus(true)
    const result = await updateScreeningStatusAction(screening.id, next)
    setIsUpdatingStatus(false)
    if (result.error) {
      toast.error(result.message)
    } else {
      setStatus(next)
      toast.success(
        next === "active"
          ? "Screening reactivated"
          : next === "paused"
            ? "Screening paused"
            : "Screening closed"
      )
    }
  }

  async function onInviteSubmit(data: InviteParsedValues) {
    const emails = data.emails
    const results = await Promise.all(
      emails.map((email) => sendScreeningInviteAction(screening.id, email))
    )
    const failed = results.filter((r) => r.error)
    if (failed.length > 0) {
      toast.error(`Failed to send ${failed.length} invite(s)`)
    } else {
      toast.success(
        emails.length === 1
          ? `Invite sent to ${emails[0]}`
          : `${emails.length} invites sent`
      )
      reset()
      router.refresh()
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <BackLink backHref="/dashboard/screenings" title="Screenings" />
      <div className="flex items-start gap-3">
        <h1 className="text-lg font-semibold tracking-tight">
          {screening.title}
        </h1>
      </div>

      {/* ── Header card ───────────────────────────────────────────────────── */}

      {/* Status + actions on the same line */}
      <div className="flex items-center justify-between">
        <StatusBadge status={status} />

        <div className="flex items-center gap-2">
          {status === "active" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange("paused")}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <CircleDashedIcon className="size-3.5 animate-spin" />
              ) : (
                <PauseIcon className="size-3.5" />
              )}
              Pause
            </Button>
          )}
          {(status === "paused" || status === "closed") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange("active")}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <CircleDashedIcon className="size-3.5 animate-spin" />
              ) : (
                <PlayIcon className="size-3.5" />
              )}
              {status === "closed" ? "Reopen" : "Reactivate"}
            </Button>
          )}
          {status !== "closed" && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => handleStatusChange("closed")}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <CircleDashedIcon className="size-3.5 animate-spin" />
              ) : (
                <XCircleIcon className="size-3.5" />
              )}
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Description accordion */}
      <Accordion type="single" collapsible className="mt-4">
        <AccordionItem value="description" className="px-3">
          <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
            Description
          </AccordionTrigger>
          <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
            {screening.description}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <StatsRow candidates={candidates} invites={invites} />

      {/* ── Share & invite ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-1">
        {(() => {
          const canUpdate = status === "active"
          const card = (
            <Card className="flex h-full flex-row items-start justify-between">
              <CardHeader className="flex-grow">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <PencilIcon className="size-4 text-muted-foreground" />
                  Update screening
                </CardTitle>
                <CardDescription className="text-xs">
                  {canUpdate
                    ? "This should only be used for minor updates."
                    : isClosed
                      ? "This screening is closed."
                      : "Reactivate the screening to update it."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 pl-0">
                <ArrowRightIcon className="size-5 text-muted-foreground" />
              </CardContent>
            </Card>
          )

          if (!canUpdate) {
            return (
              <div
                className={cn(
                  "transition-[transform_opacity] hover:scale-[1.02]",
                  "cursor-not-allowed opacity-60"
                )}
              >
                {card}
              </div>
            )
          }

          return (
            <Link
              className="transition-[transform_opacity] hover:scale-[1.02]"
              href={`/dashboard/screenings/${screening.id}/edit`}
            >
              {card}
            </Link>
          )
        })()}

        {/* Send invites card — click to open dialog */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => status === "active" && setInviteDialogOpen(true)}
          onKeyDown={(e) =>
            e.key === "Enter" &&
            status === "active" &&
            setInviteDialogOpen(true)
          }
          className={cn(
            "transition-transform hover:scale-[1.02]",
            status === "active"
              ? "cursor-pointer"
              : "cursor-not-allowed opacity-60"
          )}
        >
          <Card className="flex h-full flex-row items-start justify-between">
            <CardHeader className="flex-grow">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <MailIcon className="size-4 text-muted-foreground" />
                Send invites
              </CardTitle>
              <CardDescription className="text-xs">
                {status === "active"
                  ? "Email one or more candidates directly with a personal invite link."
                  : "Reactivate the screening to send invites."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 pl-0">
              <MousePointerClickIcon className="size-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MailIcon className="size-4" />
              Send invites
            </DialogTitle>
            <DialogDescription>
              Enter one or more email addresses separated by commas or new
              lines.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(onInviteSubmit)}
            className="space-y-4 pt-2"
          >
            <Field data-invalid={!!errors.emails}>
              <Textarea
                placeholder={
                  "alice@example.com, bob@example.com\ncarol@example.com"
                }
                disabled={isSendingInvite}
                rows={4}
                className="resize-none text-sm"
                aria-invalid={!!errors.emails || undefined}
                {...register("emails")}
              />
              <FieldError>{errors.emails?.message}</FieldError>
            </Field>
            <Button type="submit" className="w-full" disabled={isSendingInvite}>
              {isSendingInvite ? (
                <CircleDashedIcon className="size-4 animate-spin" />
              ) : (
                "Send invites"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Candidates table ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <UserIcon className="size-4" aria-hidden />
            Candidates
            <span className="ml-auto font-normal text-muted-foreground">
              {candidates.length} total
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {candidates.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No candidates yet. Share the link or send invites above.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Applied</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {[c.first_name, c.last_name].filter(Boolean).join(" ") ||
                        "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.email}
                    </TableCell>
                    <TableCell>
                      <StageBadge stage={c.stage} />
                    </TableCell>
                    <TableCell>
                      {c.interview?.result ? (
                        <ResultBadge result={c.interview.result} />
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(c.created_at), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Invites table ─────────────────────────────────────────────────── */}
      {invites.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <MailIcon className="size-4" aria-hidden />
              Sent invites
              <span className="ml-auto font-normal text-muted-foreground">
                {invites.length} total
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="text-sm">{invite.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          invite.status === "sent"
                            ? "border-blue-200 bg-blue-50 text-blue-600"
                            : invite.status === "completed"
                              ? "border-green-200 bg-green-50 text-green-600"
                              : "text-muted-foreground"
                        }
                      >
                        {invite.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {invite.sent_at
                        ? format(new Date(invite.sent_at), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <Badge
        variant="outline"
        className="border-green-200 bg-green-50 text-green-700"
      >
        Active
      </Badge>
    )
  }
  if (status === "paused") {
    return (
      <Badge
        variant="outline"
        className="border-yellow-200 bg-yellow-50 text-yellow-700"
      >
        Paused
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Closed
    </Badge>
  )
}

function StageBadge({ stage }: { stage: string }) {
  const map: Record<string, { label: string; icon: React.ReactNode }> = {
    details: { label: "Details", icon: <ClockIcon className="size-3" /> },
    photo: { label: "Photo", icon: <ClockIcon className="size-3" /> },
    resume: { label: "Resume", icon: <ClockIcon className="size-3" /> },
    interview: { label: "Interview", icon: <ClockIcon className="size-3" /> },
    completed: {
      label: "Completed",
      icon: <CheckCircleIcon className="size-3 text-green-600" />,
    },
  }
  const entry = map[stage] ?? { label: stage, icon: null }
  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      {entry.icon}
      {entry.label}
    </span>
  )
}

function ResultBadge({ result }: { result: string }) {
  const isPass = result.toLowerCase() === "pass"
  return (
    <Badge
      variant="outline"
      className={
        isPass
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-red-200 bg-red-50 text-red-700"
      }
    >
      {isPass ? (
        <CheckCircleIcon className="mr-1 size-3" />
      ) : (
        <XCircleIcon className="mr-1 size-3" />
      )}
      {result}
    </Badge>
  )
}
