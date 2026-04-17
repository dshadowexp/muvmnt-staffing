"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  COMPLIANCE_CATALOG,
  getComplianceDescription,
  type ComplianceName,
} from "@/lib/constants";
import { saveComplianceAction } from "@/features/profile/actions/compliance-actions";
import {
  FileInput,
  uploadFileToStorage,
} from "@/features/storage/components/file-input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Field, FieldGroup } from "@/components/ui/field";

interface ComplianceFormProps {
  /** Names already on file — omitted from the picker. */
  existingNames?: string[];
  onSaved?: () => void;
}

export function ComplianceForm({
  existingNames = [],
  onSaved,
}: ComplianceFormProps) {
  const [selected, setSelected] = useState<ComplianceName | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("kyc.onboarding.forms.compliance.picker");

  const available = useMemo(() => {
    const existing = new Set(existingNames);
    return COMPLIANCE_CATALOG.filter((c) => !existing.has(c.name));
  }, [existingNames]);

  const description = selected ? getComplianceDescription(selected) : undefined;
  const canSave = !!selected && !!file && !isPending;

  function handleSave() {
    if (!selected || !file) return;

    startTransition(async () => {
      try {
        const { key } = await uploadFileToStorage({
          file,
          context: "compliance",
        });

        const res = await saveComplianceAction({ name: selected, file_url: key });
        if (res.error) {
          toast.error(res.message);
          return;
        }

        toast.success(res.message);
        setSelected(null);
        setFile(null);
        onSaved?.();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : t("saveFailed"),
        );
      }
    });
  }

  return (
    <div className="space-y-5">
      <FieldGroup>
        <Field className="w-full">
          <Popover
            open={popoverOpen}
            onOpenChange={(o) => {
              if (isPending) return;
              setPopoverOpen(o);
            }}
          >
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between font-normal"
                disabled={isPending || available.length === 0}
              >
                <span
                  className={
                    selected ? "text-foreground" : "text-muted-foreground"
                  }
                >
                  {selected ??
                    (available.length > 0 ? t("selectType") : t("allAdded"))}
                </span>
                <ChevronDown className="size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-[var(--radix-popover-trigger-width)] max-h-80 overflow-y-auto p-0"
              onWheel={(e) => e.stopPropagation()}
            >
              <ul className="py-1">
                {available.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">
                    {t("allAdded")}
                  </li>
                ) : (
                  available.map((option) => (
                    <li key={option.name}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-muted"
                        onClick={() => {
                          setSelected(option.name as ComplianceName);
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
          <p className="mt-1 text-xs text-muted-foreground">{t("helper")}</p>
        </Field>
      </FieldGroup>

      {selected && (
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="space-y-1">
            <div className="text-sm font-medium">{selected}</div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>

          <FileInput
            context="compliance"
            accept={[".pdf", ".png", ".jpg", ".jpeg"]}
            uploadToCloud={false}
            onSelectedFile={setFile}
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                setSelected(null);
                setFile(null);
              }}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={handleSave}
              disabled={!canSave}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {t("save")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
