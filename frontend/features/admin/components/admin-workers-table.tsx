"use client";

import { updateAdminWorkerStatus } from "@/features/admin/mutations";
import type { AdminWorkerRow } from "@/features/admin/dal/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link, useRouter } from "@/i18n/navigation";
import { format } from "date-fns";
import { CircleCheckIcon, EllipsisVerticalIcon, LoaderIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "approved", label: "Approved" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
] as const;

function statusSelectOptions(worker: AdminWorkerRow | null) {
  const map = new Map<string, string>();
  for (const o of STATUS_OPTIONS) map.set(o.value, o.label);
  const raw = worker?.status?.trim();
  if (raw) {
    const lower = raw.toLowerCase();
    const exists = [...map.keys()].some((k) => k.toLowerCase() === lower);
    if (!exists) map.set(raw, raw);
  }
  return [...map.entries()].map(([value, label]) => ({ value, label }));
}

function WorkerStatusBadge({ status }: { status: string | null }) {
  const label = status?.trim() || "Pending";
  const normalized = label.toLowerCase();
  const isComplete =
    normalized === "done" ||
    normalized === "active" ||
    normalized === "approved" ||
    normalized === "verified";

  return (
    <Badge variant="outline" className="gap-1.5 px-1.5 text-muted-foreground">
      {isComplete ? (
        <CircleCheckIcon className="size-3.5 shrink-0 fill-green-500 dark:fill-green-400" />
      ) : (
        <LoaderIcon className="size-3.5 shrink-0" />
      )}
      {label}
    </Badge>
  );
}

function UpdateStatusDialog({
  worker,
  open,
  onOpenChange,
}: {
  worker: AdminWorkerRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState("");
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (worker) {
      const raw = worker.status?.trim();
      setStatus(raw && raw.length > 0 ? raw : "pending");
    }
  }, [worker]);

  async function onSave() {
    if (!worker) return;
    setPending(true);
    const res = await updateAdminWorkerStatus(worker.id, status);
    setPending(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("Status updated");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update worker status</DialogTitle>
          <DialogDescription>
            {worker
              ? `${worker.first_name} ${worker.last_name}`
              : "Select a status for this worker."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <Label htmlFor="admin-worker-status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="admin-worker-status" className="w-full">
              <SelectValue placeholder="Choose status" />
            </SelectTrigger>
            <SelectContent>
              {statusSelectOptions(worker).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void onSave()} disabled={pending || !worker}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminWorkersTable({ workers }: { workers: AdminWorkerRow[] }) {
  const [statusWorker, setStatusWorker] = React.useState<AdminWorkerRow | null>(
    null,
  );

  return (
    <>
      <Card size="sm" className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Profession</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Joined</TableHead>
              <TableHead className="w-12 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground py-8 text-center"
                >
                  No workers yet
                </TableCell>
              </TableRow>
            ) : (
              workers.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">
                    {w.first_name} {w.last_name}
                  </TableCell>
                  <TableCell>{w.profession}</TableCell>
                  <TableCell>
                    <WorkerStatusBadge status={w.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right">
                    {format(new Date(w.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="text-muted-foreground data-[state=open]:bg-muted size-8"
                          size="icon"
                        >
                          <EllipsisVerticalIcon className="size-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/workers/${w.id}`}>Review</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => setStatusWorker(w)}
                        >
                          Update status
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <UpdateStatusDialog
        worker={statusWorker}
        open={statusWorker !== null}
        onOpenChange={(o) => {
          if (!o) setStatusWorker(null);
        }}
      />
    </>
  );
}
