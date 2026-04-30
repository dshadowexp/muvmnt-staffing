import { LockIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function LockedShiftSection({
  title,
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <Card className="border-border/80 opacity-60">
      <CardContent className="flex items-start justify-between gap-4 p-6">
        <div className="min-w-0 space-y-1">
          {title ? <p className="font-semibold">{title}</p> : null}
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <LockIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </CardContent>
    </Card>
  );
}
