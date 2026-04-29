"use client";

import { updateAdminWorkerLifecycleStage } from "@/features/admin/mutations";
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
import { WORKER_STAGE_ORDER } from "@/features/workers/lib/worker-stage-order";
import { useRouter } from "@/i18n/navigation";
import * as React from "react";
import { toast } from "sonner";

const STAGE_LABEL: Record<string, string> = {
  interview: "Interview",
  compliance: "Compliance",
  payroll: "Payroll",
  availability: "Availability",
  live: "Live",
};

export function AdminWorkerStageEditor({
  workerId,
  workerName,
  initialStage,
}: {
  workerId: string;
  workerName: string;
  initialStage: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [stage, setStage] = React.useState(initialStage);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setStage(initialStage);
  }, [initialStage, open]);

  const displayLabel = STAGE_LABEL[initialStage] ?? initialStage;

  async function onSave() {
    if (stage === initialStage) {
      toast.message("No changes to save");
      return;
    }
    setSaving(true);
    try {
      const res = await updateAdminWorkerLifecycleStage(
        workerId,
        stage as (typeof WORKER_STAGE_ORDER)[number],
      );
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Stage updated");
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
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          Update stage
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lifecycle stage</DialogTitle>
            <DialogDescription>{workerName}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Label htmlFor="admin-worker-stage">Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger id="admin-worker-stage" className="w-full">
                <SelectValue placeholder="Choose stage" />
              </SelectTrigger>
              <SelectContent>
                {WORKER_STAGE_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_LABEL[s] ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void onSave()}
              disabled={saving || stage === initialStage}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
