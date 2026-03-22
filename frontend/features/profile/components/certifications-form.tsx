"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, X } from "lucide-react";
import { CERTIFICATION_NAMES } from "@/lib/constants";
import type { CertificationName } from "@/lib/constants";
import {
  certificationsSchema,
  type CertificationsFormValues,
} from "@/features/profile/schemas/certifications";
import {
  saveCertificationAction,
  deleteCertificationAction,
} from "@/features/profile/actions/certification-actions";
import { FileInput } from "@/features/storage/components/file-input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { toast } from "sonner";

interface CertificationsFormProps {
  initialCertifications?: Array<{ name: string; file_url: string }>;
}

export function CertificationsForm({
  initialCertifications = [],
}: CertificationsFormProps) {
  const form = useForm<CertificationsFormValues>({
    defaultValues: {
      certifications:
        initialCertifications.length > 0
          ? initialCertifications.map((c: { name: string; file_url: string }) => ({
            name: c.name,
            file_url: c.file_url,
          }))
          : [],
    },
    resolver: zodResolver(certificationsSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "certifications",
  });

  const certifications = form.watch("certifications");
  const selectedNames = certifications.map((c) => c.name);
  const available = CERTIFICATION_NAMES.filter((n) => !selectedNames.includes(n));
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  function handleAdd(name: CertificationName) {
    append({ name, file_url: "" });
    setPopoverOpen(false);
  }

  function handleRemove(index: number) {
    remove(index);
  }

  async function handleFileUploaded(index: number, name: string, key: string) {
    form.setValue(`certifications.${index}.file_url`, key, {
      shouldValidate: true,
    });

    setSavingIndex(index);
    const { error, message } = await saveCertificationAction(name, key);
    setSavingIndex(null);

    if (error) {
      toast.error(message);
    } else {
      toast.success(message);
    }
  }

  return (
    <div className="space-y-6">
      <FieldGroup>
        <Field className="w-full flex-1">
          <FieldLabel>Add certification</FieldLabel>
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between font-normal"
              >
                <span className="text-muted-foreground">
                  {available.length > 0 ? "Select to add…" : "All added"}
                </span>
                <ChevronDown className="size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
              <ul className="max-h-48 overflow-auto py-1">
                {available.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">
                    All certifications added
                  </li>
                ) : (
                  available.map((name) => (
                    <li key={name}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => handleAdd(name)}
                      >
                        {name}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </PopoverContent>
          </Popover>
        </Field>

        {fields.length > 0 && (
          <div className="space-y-4">
            {fields.map((field, index) => {
              const hasFile = !!certifications[index]?.file_url;
              return (
                <div
                  key={field.id}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium">
                      {certifications[index]?.name}
                      <span className="ml-0.5 text-destructive">*</span>
                    </h3>
                    {!hasFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemove(index)}
                        title="Remove certification"
                        aria-label="Remove certification"
                      >
                        <X className="size-3.5" />
                      </Button>
                    )}
                  </div>
                  <FileInput
                    context="certifications"
                    initialFileKey={certifications[index]?.file_url ?? undefined}
                    onUploaded={(file) =>
                      file.key &&
                      certifications[index]?.name &&
                      handleFileUploaded(
                        index,
                        certifications[index].name,
                        file.key
                      )
                    }
                    onFileChange={async (hasFile) => {
                      if (!hasFile) {
                        const name = certifications[index]?.name;
                        if (name) {
                          await deleteCertificationAction(name);
                        }
                        form.setValue(`certifications.${index}.file_url`, "", {
                          shouldValidate: true,
                        });
                      }
                    }}
                  />
                  <FieldError>
                    {form.formState.errors.certifications?.[index]?.file_url
                      ?.message}
                  </FieldError>
                </div>
              );
            })}
          </div>
        )}
      </FieldGroup>

      {savingIndex !== null && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoadingSwap isLoading>
            <span />
          </LoadingSwap>
          Saving...
        </div>
      )}
    </div>
  );
}
