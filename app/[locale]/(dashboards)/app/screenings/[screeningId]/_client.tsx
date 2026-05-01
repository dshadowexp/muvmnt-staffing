"use client"

import { useState, useTransition } from "react"
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
  TimerIcon,
  CalendarClockIcon,
  LanguagesIcon,
  ClipboardListIcon,
  BanIcon,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Field, FieldError } from "@/components/ui/field"
import type {
  ScreeningRow,
  ScreeningInviteWithAudit,
  CandidateWithResult,
} from "@/features/screenings/dal/queries"
import {
  updateScreeningStatusAction,
  sendScreeningInvitesBatchAction,
  revokeScreeningInviteAction,
} from "@/features/screenings/actions"
import { cn } from "@/lib/utils"
import { BackLink } from "@/components/back-link"

type Props = {
  screening: ScreeningRow
  invites: ScreeningInviteWithAudit[]
  candidates: CandidateWithResult[]
}

// ─── Stats row ────────────────────────────────────────────────────────────────

function StatsRow({
  candidates,
  invites,
}: {
  candidates: CandidateWithResult[]
  invites: ScreeningInviteWithAudit[]
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
      label: "Invites sent",
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
  const [revokeInvite, setRevokeInvite] = useState<{
    id: string
    email: string
  } | null>(null)
  const [isRevokePending, startRevokeTransition] = useTransition()

  function confirmRevokeInvite() {
    if (!revokeInvite) return
    const { id, email } = revokeInvite
    startRevokeTransition(async () => {
      const result = await revokeScreeningInviteAction(screening.id, id)
      setRevokeInvite(null)
      if (result.error) {
        toast.error(result.message)
      } else {
        toast.success(`Invite revoked for ${email}`)
        router.refresh()
      }
    })
  }

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
    const batch = await sendScreeningInvitesBatchAction(screening.id, emails)

    if (batch.error) {
      toast.error(batch.message)
      return
    }

    type FailedEntry = { email: string; reason: string }
    const failed: FailedEntry[] = batch.results.flatMap((r) =>
      r.ok ? [] : [{ email: r.email, reason: r.message }]
    )
    const succeeded = batch.results.filter((r) => r.ok).length

    if (failed.length > 0) {
      const failedEmails = failed.map((f) => f.email)

      const alreadyInvited = failed
        .filter((f) => f.reason === "already invited")
        .map((f) => f.email)
      const otherErrors = failed.filter((f) => f.reason !== "already invited")

      const lines: string[] = []
      if (alreadyInvited.length > 0) {
        lines.push(`Already invited: ${alreadyInvited.join(", ")}`)
      }
      otherErrors.forEach((f) => lines.push(`${f.email}: ${f.reason}`))

      if (succeeded > 0) {
        toast.warning(
          `${succeeded} invite${succeeded !== 1 ? "s" : ""} sent — ${failed.length} could not be sent`,
          { description: lines.join("\n") }
        )
        router.refresh()
      } else {
        toast.error(
          `Could not send ${failed.length} invite${failed.length !== 1 ? "s" : ""}`,
          { description: lines.join("\n") }
        )
      }

      reset({ emails: failedEmails.join("\n") })
    } else {
      toast.success(
        emails.length === 1
          ? `Invite sent to ${emails[0]}`
          : `${emails.length} invites sent`
      )
      reset()
      setInviteDialogOpen(false)
      router.refresh()
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <BackLink backHref="/app/screenings" title="Screenings" />
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
      <Accordion type="single" collapsible className="mt-4 rounded-none border-0 shadow-none">
        <AccordionItem value="details" className="px-3">
          <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
            Details
          </AccordionTrigger>
          <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
            <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5 text-left">
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-normal text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                        <TimerIcon
                            className="size-3.5 shrink-0"
                            aria-hidden
                        />
                        {screening.interview_duration} minutes
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <CalendarClockIcon className="size-3.5 shrink-0" aria-hidden />
                        {screening.deadline_days} days
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <LanguagesIcon
                            className="size-3.5 shrink-0"
                            aria-hidden
                        />
                        {}
                    </span>

                </span>
            </div>
          </AccordionContent>
        </AccordionItem>
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
              href={`/app/screenings/${screening.id}/edit`}
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

        {/* Evaluate card — active when there are candidates */}
        {(() => {
          const canEvaluate = candidates.length > 0
          const card = (
            <Card className="flex h-full flex-row items-start justify-between">
              <CardHeader className="flex-grow">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <ClipboardListIcon className="size-4 text-muted-foreground" />
                  Evaluate candidates
                </CardTitle>
                <CardDescription className="text-xs">
                  {canEvaluate
                    ? "Review and compare candidate interview results."
                    : "Candidates will appear here once they start the screening."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 pl-0">
                <ArrowRightIcon className="size-5 text-muted-foreground" />
              </CardContent>
            </Card>
          )

          if (!canEvaluate) {
            return (
              <div className="cursor-not-allowed opacity-60">
                {card}
              </div>
            )
          }

          return (
            <Link
              className="transition-transform hover:scale-[1.02]"
              href={`/app/screenings/${screening.id}/evaluate`}
            >
              {card}
            </Link>
          )
        })()}
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
      <Card className="overflow-hidden rounded-xl border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-muted/30 pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <UserIcon className="size-4 text-muted-foreground" aria-hidden />
            Candidates
            <span className="ml-auto text-xs font-normal tabular-nums text-muted-foreground">
              {candidates.length}
            </span>
          </CardTitle>
          <CardDescription className="text-xs">
            People who opened your invite link and started or completed the flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {candidates.length === 0 ? (
            <div className="py-14 text-center">
              <UsersIcon className="mx-auto mb-2 size-8 text-muted-foreground/50" aria-hidden />
              <p className="text-sm text-muted-foreground">
                No candidates yet. Send invites above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="h-11 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Name
                    </TableHead>
                    <TableHead className="h-11 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Email
                    </TableHead>
                    <TableHead className="h-11 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Stage
                    </TableHead>
                    <TableHead className="h-11 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Result
                    </TableHead>
                    <TableHead className="h-11 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Applied
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((c) => (
                    <TableRow
                      key={c.id}
                      className="border-border/40 odd:bg-muted/20 hover:bg-muted/40"
                    >
                      <TableCell className="max-w-[10rem] truncate py-3 font-medium">
                        {[c.first_name, c.last_name].filter(Boolean).join(" ") ||
                          "—"}
                      </TableCell>
                      <TableCell className="max-w-[14rem] truncate py-3 text-sm text-muted-foreground">
                        {c.email}
                      </TableCell>
                      <TableCell className="py-3">
                        <StageBadge stage={c.stage} />
                      </TableCell>
                      <TableCell className="py-3">
                        {c.interview?.result ? (
                          <ResultBadge result={c.interview.result} />
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-right text-sm tabular-nums text-muted-foreground">
                        {format(new Date(c.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Invites table ─────────────────────────────────────────────────── */}
      <Card className="overflow-hidden rounded-xl border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-muted/30 pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <MailIcon className="size-4 text-muted-foreground" aria-hidden />
            Invites
            <span className="ml-auto text-xs font-normal tabular-nums text-muted-foreground">
              {invites.length}
            </span>
          </CardTitle>
          <CardDescription className="text-xs">
            Every email invite and its lifecycle. Revoking records who withdrew it and when; the
            candidate link may still work until you send a replacement invite.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {invites.length === 0 ? (
            <div className="py-14 text-center">
              <MailIcon className="mx-auto mb-2 size-8 text-muted-foreground/50" aria-hidden />
              <p className="text-sm text-muted-foreground">
                No invites sent yet. Use &quot;Send invites&quot; above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="h-11 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Email
                    </TableHead>
                    <TableHead className="h-11 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="h-11 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Sent
                    </TableHead>
                    <TableHead className="h-11 min-w-[12rem] text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Revocation (audit)
                    </TableHead>
                    <TableHead className="h-11 w-[100px] text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((invite) => (
                    <TableRow
                      key={invite.id}
                      className="border-border/40 odd:bg-muted/20 hover:bg-muted/40"
                    >
                      <TableCell className="max-w-[14rem] truncate py-3 text-sm font-medium">
                        {invite.email}
                      </TableCell>
                      <TableCell className="py-3">
                        <InviteLifecycleBadge status={invite.status} />
                      </TableCell>
                      <TableCell className="py-3 text-sm tabular-nums text-muted-foreground">
                        {invite.sent_at
                          ? format(new Date(invite.sent_at), "MMM d, yyyy · h:mm a")
                          : format(new Date(invite.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-muted-foreground">
                        {invite.status === "revoked" && invite.revoked_at ? (
                          <span className="flex flex-col gap-0.5">
                            <span className="tabular-nums text-foreground/90">
                              {format(new Date(invite.revoked_at), "MMM d, yyyy · h:mm a")}
                            </span>
                            {invite.revoked_by_email ? (
                              <span className="text-xs">
                                by {invite.revoked_by_email}
                              </span>
                            ) : (
                              <span className="text-xs">Operator recorded</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/70">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        {invite.status !== "revoked" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() =>
                              setRevokeInvite({ id: invite.id, email: invite.email })
                            }
                          >
                            <BanIcon className="size-3.5" aria-hidden />
                            <span className="sr-only">Revoke invite</span>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={revokeInvite !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeInvite(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this invite?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>
                This marks the invite as revoked for your team&apos;s audit trail (who revoked it
                and when). The candidate link is not automatically disabled.
              </span>
              {revokeInvite ? (
                <span className="block font-medium text-foreground">{revokeInvite.email}</span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevokePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isRevokePending}
              onClick={(e) => {
                e.preventDefault()
                confirmRevokeInvite()
              }}
            >
              {isRevokePending ? (
                <CircleDashedIcon className="size-4 animate-spin" />
              ) : (
                "Revoke invite"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InviteLifecycleBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200",
    sent: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-200",
    accepted:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200",
    declined:
      "border-border bg-muted/60 text-muted-foreground",
    expired:
      "border-border bg-muted/60 text-muted-foreground",
    revoked:
      "border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/20",
  }
  const label =
    status === "revoked"
      ? "Revoked"
      : status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium capitalize",
        styles[status] ?? "border-border text-muted-foreground",
      )}
    >
      {label}
    </Badge>
  )
}

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
