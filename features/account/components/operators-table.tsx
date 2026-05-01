"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  UserPlusIcon,
  SearchIcon,
  XIcon,
  LogOutIcon,
  MailIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LoadingSwap } from "@/components/ui/loading-swap";
import type { OperatorRow, PendingInviteRow } from "@/features/account/dal/queries";
import type { OperatorPermission } from "@/features/auth/types";
import {
  sendFacilityInviteAction,
  leaveTeamAction,
  revokeInviteAction,
} from "@/features/account/actions/invite";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(email: string | null): string {
  if (!email) return "?";
  const parts = email.split("@")[0].split(/[._-]/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const ROLE_LABELS: Record<OperatorPermission, string> = {
  owner: "Owner",
  manager: "Manager",
  member: "Member",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<OperatorPermission, string> = {
  owner: "bg-primary/10 text-primary border-primary/20",
  manager: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  member: "bg-muted text-muted-foreground border-border",
  viewer: "bg-muted text-muted-foreground border-border",
};

function RoleBadge({ role }: { role: OperatorPermission }) {
  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium ${ROLE_COLORS[role]}`}
    >
      {ROLE_LABELS[role]}
    </Badge>
  );
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────

function InviteModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [emails, setEmails] = useState<string[]>([""]);
  const [role, setRole] = useState<OperatorPermission>("member");
  const [isPending, startTransition] = useTransition();

  function addEmailField() {
    setEmails((prev) => [...prev, ""]);
  }

  function updateEmail(index: number, value: string) {
    setEmails((prev) => prev.map((e, i) => (i === index ? value : e)));
  }

  function removeEmail(index: number) {
    setEmails((prev) => prev.filter((_, i) => i !== index));
  }

  function handleClose() {
    setEmails([""]);
    setRole("member");
    onClose();
  }

  function handleSend() {
    const valid = emails
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

    if (valid.length === 0) {
      toast.error("Please enter at least one valid email address");
      return;
    }

    startTransition(async () => {
      const res = await sendFacilityInviteAction(valid, role);
      if (res.error) {
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
      handleClose();
      onSuccess();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite team members</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Role */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium w-full">Role</label>
            <Select value={role} onValueChange={(v) => setRole(v as OperatorPermission)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Email fields */}
          <div className="space-y-2">
            <label className="text-sm font-medium mb-2">Email addresses</label>
            <div className="space-y-2">
              {emails.map((email, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      type="email"
                      placeholder="colleague@example.com"
                      value={email}
                      onChange={(e) => updateEmail(i, e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {emails.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 shrink-0"
                      onClick={() => removeEmail(i)}
                    >
                      <XIcon className="size-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground mt-1"
              onClick={addEmailField}
            >
              <PlusIcon className="size-3.5 mr-1.5" />
              Add another
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSend} disabled={isPending}>
            <LoadingSwap isLoading={isPending}>
              Send invite{emails.filter((e) => e.trim()).length > 1 ? "s" : ""}
            </LoadingSwap>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OperatorsTable({
  operators,
  pendingInvites,
  currentUserId,
}: {
  operators: OperatorRow[];
  pendingInvites: PendingInviteRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const ownerCount = operators.filter((o) => o.permission === "owner").length;
  const isSoleOwner = (op: OperatorRow) =>
    op.permission === "owner" && ownerCount <= 1;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return operators;
    return operators.filter((op) =>
      op.email?.toLowerCase().includes(q),
    );
  }, [operators, search]);

  async function handleLeave(op: OperatorRow) {
    if (op.user_id !== currentUserId) return;
    setLeavingId(op.id);
    const res = await leaveTeamAction();
    setLeavingId(null);
    if (res.error) {
      toast.error(res.message);
    } else {
      toast.success(res.message);
      router.refresh();
    }
  }

  async function handleRevoke(inviteId: string) {
    setRevokingId(inviteId);
    const res = await revokeInviteAction(inviteId);
    setRevokingId(null);
    if (res.error) {
      toast.error(res.message);
    } else {
      toast.success(res.message);
      router.refresh();
    }
  }

  return (
    <>
      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSuccess={() => router.refresh()}
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle className="py-1">Team members</CardTitle>
          <CardDescription>
            Manage who has access to your organization.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search + Invite row — capped search width so the row isn’t one giant field */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8 lg:gap-10 justify-between">
            <div className="relative min-w-0 w-full max-w-[min(100%,16rem)] sm:max-w-[min(100%,18rem)] md:max-w-[min(100%,22rem)]">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </div>
            <Button
              size="sm"
              className="w-full shrink-0 sm:w-auto"
              onClick={() => setInviteOpen(true)}
            >
              <UserPlusIcon className="size-3.5 mr-1.5" />
              Invite members
            </Button>
          </div>

          {/* Members table */}
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-muted-foreground">
                      {search ? "No members match your search." : "No team members yet."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((op) => {
                    const isCurrentUser = op.user_id === currentUserId;
                    const cannotLeave = isSoleOwner(op);
                    const isLeaving = leavingId === op.id;

                    return (
                      <tr key={op.id}>
                        {/* Member */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-7 shrink-0">
                              <AvatarFallback className="text-xs font-medium">
                                {initials(op.email)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate font-medium">
                              {op.email ?? "Unknown"}
                              {isCurrentUser && (
                                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                  (you)
                                </span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3 w-28">
                          <RoleBadge role={op.permission} />
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3 w-12 text-right">
                          {isCurrentUser && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive"
                              disabled={cannotLeave || isLeaving}
                              title={cannotLeave ? "Cannot leave as sole owner" : "Leave team"}
                              onClick={() => void handleLeave(op)}
                            >
                              <LoadingSwap isLoading={isLeaving}>
                                <LogOutIcon className="size-3.5" />
                              </LoadingSwap>
                              <span className="sr-only">Leave</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pending invites */}
          {pendingInvites.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Pending invites
                </p>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-border">
                      {pendingInvites.map((invite) => {
                        const isRevoking = revokingId === invite.id;
                        return (
                          <tr key={invite.id}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="size-7 shrink-0">
                                  <AvatarFallback className="text-xs text-muted-foreground">
                                    <MailIcon className="size-3.5" />
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate text-muted-foreground">
                                  {invite.email}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 w-28">
                              <RoleBadge role={invite.permission as OperatorPermission} />
                            </td>
                            <td className="px-4 py-3 w-12 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-destructive"
                                disabled={isRevoking}
                                onClick={() => void handleRevoke(invite.id)}
                                title="Revoke invite"
                              >
                                <LoadingSwap isLoading={isRevoking}>
                                  <Trash2Icon className="size-3.5" />
                                </LoadingSwap>
                                <span className="sr-only">Revoke</span>
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
