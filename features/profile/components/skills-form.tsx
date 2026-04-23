"use client";

import { useMemo, useState } from "react";
import { ChevronDown, FileText, CircleDashedIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { WORKER_SKILL_IDS, type WorkerSkillId } from "@/lib/skills";
import { saveSkillAction } from "@/features/profile/actions/skill-actions";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Field, FieldGroup } from "@/components/ui/field";
import { toast } from "sonner";

interface SkillsFormProps {
  initialSkills?: Array<{ name: string }>;
  onSaved?: () => void;
}

type SkillItem = { name: string };

export function SkillsForm({ initialSkills = [], onSaved }: SkillsFormProps) {
  const tSkills = useTranslations("skills");
  const tSkillsDesc = useTranslations("skillsDesc");
  const [skills, setSkills] = useState<SkillItem[]>(initialSkills);
  const [selectedSkill, setSelectedSkill] = useState<WorkerSkillId | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedDescription = selectedSkill
    ? tSkillsDesc(selectedSkill)
    : "";

  const available = useMemo(() => {
    const existing = new Set(skills.map((s) => s.name));
    return WORKER_SKILL_IDS.filter((id) => !existing.has(id));
  }, [skills]);

  async function handleSave() {
    if (!selectedSkill) {
      toast.error("Please select a skill.");
      return;
    }

    setSaving(true);
    try {
      const res = await saveSkillAction(selectedSkill);
      if (res.error) {
        toast.error(res.message);
        return;
      }

      setSkills((prev) => [
        ...prev.filter((s) => s.name !== selectedSkill),
        { name: selectedSkill },
      ]);
      setSelectedSkill(null);
      toast.success(res.message);
      onSaved?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save skill.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <FieldGroup>
        <Field className="w-full">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between font-normal"
                disabled={saving || available.length === 0}
              >
                <span className="text-muted-foreground">
                  {selectedSkill
                    ? tSkills(selectedSkill)
                    : available.length > 0
                      ? "Select a skill..."
                      : "All skills already added"}
                </span>
                <ChevronDown className="size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-[var(--radix-popover-trigger-width)] gap-0 p-0"
            >
              {/* Inner scrollport: avoids flex `min-height:auto` on the list blocking overflow on the popover shell. */}
              <div
                className="max-h-[min(20rem,var(--radix-popper-available-height,20rem))] overflow-y-auto overscroll-contain"
              >
                <ul className="py-1">
                  {available.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-muted-foreground">
                      All skills already added
                    </li>
                  ) : (
                    available.map((id) => (
                      <li key={id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-muted"
                          onClick={() => {
                            setSelectedSkill(id);
                            setPopoverOpen(false);
                          }}
                        >
                          <div className="text-sm font-medium">{tSkills(id)}</div>
                          <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {tSkillsDesc(id)}
                          </div>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </PopoverContent>
          </Popover>
          <p className="mt-1 text-xs text-muted-foreground">
            Add one skill at a time. You&apos;ll verify it by taking a short quiz.
          </p>
        </Field>
      </FieldGroup>

      {selectedSkill && (
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="space-y-1">
            <div className="text-sm font-medium">{tSkills(selectedSkill)}</div>
            {selectedDescription ? (
              <p className="text-xs text-muted-foreground">
                {selectedDescription}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={() => setSelectedSkill(null)}
            >
              Cancel
            </Button>
            <Button type="button" size="lg" onClick={handleSave} disabled={saving}>
              {saving && <CircleDashedIcon className="size-4 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      )}

      {!selectedSkill && skills.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="size-4" />
            Select a skill above to get started.
          </div>
        </div>
      )}
    </div>
  );
}
