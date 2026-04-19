"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { enCA, frCA } from "date-fns/locale";
import { Copy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type CopyStaffRequestDayTimesPopoverProps = {
  sourceDate: string;
  allDates: string[];
  disabled?: boolean;
  onApply: (targetDates: string[]) => void;
};

/** Copy one day’s time ranges (all segments) to other selected dates (staff request wizard). */
export function CopyStaffRequestDayTimesPopover({
  sourceDate,
  allDates,
  disabled,
  onApply,
}: CopyStaffRequestDayTimesPopoverProps) {
  const t = useTranslations("staffRequest.copyTimes");
  const locale = useLocale();
  const dateLocale = locale.toLowerCase().startsWith("fr") ? frCA : enCA;
  const [open, setOpen] = useState(false);
  const [targets, setTargets] = useState<Set<string>>(() => new Set());

  const selectable = useMemo(
    () => allDates.filter((d) => d !== sourceDate),
    [allDates, sourceDate],
  );

  function formatYmd(ymd: string) {
    return format(parseISO(`${ymd}T12:00:00`), "EEE MMM d", { locale: dateLocale });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setTargets(new Set());
  }

  const allSelected =
    selectable.length > 0 && selectable.every((d) => targets.has(d));

  function toggleSelectAll() {
    setTargets(() => (allSelected ? new Set() : new Set(selectable)));
  }

  function toggleDay(d: string) {
    setTargets((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  function apply() {
    onApply(Array.from(targets));
    setOpen(false);
  }

  const canOpen = !disabled && selectable.length > 0;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0"
          disabled={!canOpen}
          aria-label={t("triggerAria")}
        >
          <Copy className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-0">
        <div className="border-border border-b px-4 py-3">
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            {t("title")}
          </p>
        </div>
        <div className="max-h-[min(60vh,320px)] overflow-y-auto px-2 py-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 hover:bg-muted/60">
            <Checkbox
              checked={allSelected}
              onCheckedChange={() => toggleSelectAll()}
            />
            <span className="text-sm font-medium">{t("selectAll")}</span>
          </label>
          <div className="border-border my-1 border-t" />
          {selectable.map((ymd) => (
            <label
              key={ymd}
              className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 hover:bg-muted/60"
            >
              <Checkbox
                checked={targets.has(ymd)}
                onCheckedChange={() => toggleDay(ymd)}
              />
              <span className="text-sm">{formatYmd(ymd)}</span>
            </label>
          ))}
        </div>
        <div className="border-border flex items-center justify-between gap-2 border-t px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setOpen(false)}
          >
            {t("cancel")}
          </Button>
          <Button type="button" size="sm" className="rounded-full px-5" onClick={apply}>
            {t("apply")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
