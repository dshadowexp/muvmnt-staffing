import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function normalizeStatus(status: string | null | undefined): string {
  return (status ?? "scheduled").trim().toLowerCase() || "scheduled";
}

function statusLabel(
  status: string | null | undefined,
  scheduledLabel: string,
): string {
  if (!status?.trim()) return scheduledLabel;
  const s = normalizeStatus(status);
  const labels: Record<string, string> = {
    scheduled: "Scheduled",
    confirmed: "Confirmed",
    in_progress: "In progress",
    checked_out: "Checked out",
    completed: "Completed",
    reassigning: "Finding replacement",
    cancelled: "Cancelled",
    canceled: "Cancelled",
    declined: "Declined",
  };
  return labels[s] ?? status.trim().replace(/_/g, " ");
}

export function ShiftStatusBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const s = normalizeStatus(status);
  const variant =
    s === "completed" || s === "done" || s === "paid"
      ? "default"
      : s === "cancelled" || s === "canceled" || s === "declined"
        ? "destructive"
        : s === "open" || s === "draft"
          ? "outline"
        : s === "confirmed" || s === "in_progress" || s === "checked_out"
          ? "default"
          : s === "reassigning"
            ? "secondary"
          : "secondary";

  return (
    <Badge variant={variant} className={cn("normal-case", className)}>
      {statusLabel(status, "Scheduled")}
    </Badge>
  );
}
