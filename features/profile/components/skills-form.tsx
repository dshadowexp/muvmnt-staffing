"use client";

import { useMemo, useState } from "react";
import { ChevronDown, FileText, Loader2 } from "lucide-react";
import {
  SKILL_CATALOG,
  getSkillDescription,
  type SkillName,
} from "@/lib/constants";
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
  const [skills, setSkills] = useState<SkillItem[]>(initialSkills);
  const [selectedSkill, setSelectedSkill] = useState<SkillName | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedDescription = selectedSkill
    ? getSkillDescription(selectedSkill)
    : undefined;

  const available = useMemo(() => {
    const existing = new Set(skills.map((s) => s.name));
    return SKILL_CATALOG.filter((s) => !existing.has(s.name));
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
                    ? selectedSkill
                    : available.length > 0
                      ? "Select a skill..."
                      : "All skills already added"}
                </span>
                <ChevronDown className="size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-[var(--radix-popover-trigger-width)] max-h-80 overflow-y-auto p-0"
            >
              <ul className="py-1">
                {available.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">
                    All skills already added
                  </li>
                ) : (
                  available.map((option) => (
                    <li key={option.name}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-muted"
                        onClick={() => {
                          setSelectedSkill(option.name as SkillName);
                          setPopoverOpen(false);
                        }}
                      >
                        <div className="text-sm font-medium">{option.name}</div>
                        <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {option.description}
                        </div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
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
            <div className="text-sm font-medium">{selectedSkill}</div>
            {selectedDescription && (
              <p className="text-xs text-muted-foreground">
                {selectedDescription}
              </p>
            )}
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
              {saving && <Loader2 className="size-4 animate-spin" />}
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
