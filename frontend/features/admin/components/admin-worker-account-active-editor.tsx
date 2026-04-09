"use client";

import { updateAdminUserAccountActive } from "@/features/admin/mutations";
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

function accountActiveLabel(v: boolean | null | undefined) {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "—";
}

function accountActiveToForm(v: boolean | null | undefined): "yes" | "no" {
  return v === true ? "yes" : "no";
}

export function AdminWorkerAccountActiveEditor({
  workerId,
  workerName,
  userId,
  initialAccountActive,
}: {
  workerId: string;
  workerName: string;
  userId: string;
  initialAccountActive: boolean | null | undefined;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [accountActive, setAccountActive] = React.useState<"yes" | "no">(() =>
    accountActiveToForm(initialAccountActive),
  );
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setAccountActive(accountActiveToForm(initialAccountActive));
  }, [open, initialAccountActive]);

  const initialActiveBool = initialAccountActive === true;
  const selectedActiveBool = accountActive === "yes";
  const dirty = initialActiveBool !== selectedActiveBool;

  async function onSave() {
    if (!dirty) {
      toast.message("No changes to save");
      return;
    }
    setSaving(true);
    try {
      const res = await updateAdminUserAccountActive(
        userId,
        workerId,
        selectedActiveBool,
      );
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Account updated");
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span>{accountActiveLabel(initialAccountActive)}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          Update
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update account access</DialogTitle>
            <DialogDescription>{workerName}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Label htmlFor="admin-worker-account-active">Account active</Label>
            <Select
              value={accountActive}
              onValueChange={(v) => setAccountActive(v as "yes" | "no")}
            >
              <SelectTrigger
                id="admin-worker-account-active"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Active (can sign in)</SelectItem>
                <SelectItem value="no">Inactive (blocked)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void onSave()} disabled={saving || !dirty}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
