"use client";

import { updateAdminWorkerStatus } from "@/features/admin/mutations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "@/i18n/navigation";
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

function statusSelectOptions(current: string | null | undefined) {
  const map = new Map<string, string>();
  for (const o of STATUS_OPTIONS) map.set(o.value, o.label);
  const raw = current?.trim();
  if (raw) {
    const lower = raw.toLowerCase();
    const exists = [...map.keys()].some((k) => k.toLowerCase() === lower);
    if (!exists) map.set(raw, raw);
  }
  return [...map.entries()].map(([value, label]) => ({ value, label }));
}

function initialSelectValue(current: string | null | undefined): string {
  const raw = current?.trim();
  if (!raw) return "pending";
  const lower = raw.toLowerCase();
  const known = STATUS_OPTIONS.find((o) => o.value === lower);
  return known ? known.value : raw;
}

function statusDisplayLabel(current: string | null | undefined): string {
  const raw = current?.trim();
  if (!raw) return "Pending";
  const lower = raw.toLowerCase();
  const known = STATUS_OPTIONS.find((o) => o.value === lower);
  return known ? known.label : raw;
}

export function AdminWorkerStatusEditor({
  workerId,
  workerName,
  initialStatus,
}: {
  workerId: string;
  workerName: string;
  initialStatus: string | null | undefined;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState(() =>
    initialSelectValue(initialStatus),
  );
  const [saving, setSaving] = React.useState(false);

  const displayLabel = statusDisplayLabel(initialStatus);

  React.useEffect(() => {
    setStatus(initialSelectValue(initialStatus));
  }, [open, initialStatus]);

  const statusDirty =
    initialSelectValue(initialStatus).toLowerCase() !==
    status.toLowerCase();

  async function onSave() {
    if (!statusDirty) {
      toast.message("No changes to save");
      return;
    }
    setSaving(true);
    try {
      const res = await updateAdminWorkerStatus(workerId, status);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Status updated");
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{displayLabel}</Badge>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          Update status
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update placement status</DialogTitle>
            <DialogDescription>{workerName}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Label htmlFor="admin-worker-status-modal">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="admin-worker-status-modal" className="w-full">
                <SelectValue placeholder="Choose status" />
              </SelectTrigger>
              <SelectContent>
                {statusSelectOptions(initialStatus).map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void onSave()} disabled={saving || !statusDirty}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
