"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { WORK_AUTHORIZATION_TYPES } from "@/lib/constants";
import type { WorkAuthorization } from "@/types";
import { authorizationSchema, type AuthorizationFormValues } from "@/features/profile/schemas/authorization";
import {
  upsertWorkAuthorizationAction,
  deleteWorkAuthorizationAction,
} from "@/features/profile/actions/authorization-actions";
import { deleteFile } from "@/features/storage/dal/mutations";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/components/ui/multi-select";
import { FileInput } from "@/features/storage/components/file-input";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { toast } from "sonner";

interface WorkerAuthorizationFormProps {
  initialWorkAuthorization?:
    | { type: string; file_url: string }
    | null;
}

export function WorkerAuthorizationForm({
  initialWorkAuthorization,
}: WorkerAuthorizationFormProps) {
  const [fileKey, setFileKey] = useState<string | null>(
    initialWorkAuthorization?.file_url ?? null
  );
  const [saving, setSaving] = useState(false);

  const form = useForm<AuthorizationFormValues>({
    defaultValues: {
      workAuthorization: (initialWorkAuthorization?.type ?? "") as WorkAuthorization,
    },
    resolver: zodResolver(authorizationSchema),
  });

  const { setValue, watch, formState } = form;
  const workAuthorization = watch("workAuthorization");

  const hasType = !!workAuthorization;
  const hasFile = !!fileKey;
  const canSave = hasType && hasFile;

  const isUnchanged =
    initialWorkAuthorization &&
    workAuthorization === initialWorkAuthorization.type &&
    fileKey === initialWorkAuthorization.file_url;

  useEffect(() => {
    if (!canSave || isUnchanged) return;

    async function save() {
      setSaving(true);
      const { error, message } = await upsertWorkAuthorizationAction(
        workAuthorization,
        fileKey!
      );
      setSaving(false);
      if (error) {
        toast.error(message);
      } else {
        toast.success(message);
      }
    }

    save();
  }, [canSave, isUnchanged, workAuthorization, fileKey]);

  function handleFileUploaded(file: { key?: string }) {
    if (file.key) {
      setFileKey(file.key);
    }
  }

  async function handleFileRemoved() {
    setFileKey(null);
    const { error, message } = await deleteWorkAuthorizationAction();
    if (error) toast.error(message);
  }

  async function handleTypeChange(values: string[]) {
    const newType = (values[0] ?? "") as WorkAuthorization;
    const prevType = workAuthorization;

    setValue("workAuthorization", newType, { shouldValidate: true });

    if (fileKey && newType !== prevType) {
      const keyToDelete = fileKey;
      setFileKey(null);

      try {
        await deleteFile(keyToDelete);
      } catch {
        toast.error("Failed to remove file from storage.");
      }

      const { error, message } = await deleteWorkAuthorizationAction();
      if (error) toast.error(message);
    }
  }

  return (
    <>
      <FieldGroup>
        <Field data-invalid={!!form.formState.errors.workAuthorization}>
          <FieldLabel>Work authorization type</FieldLabel>
          <FieldDescription>
            Select your legal status to work in Canada
          </FieldDescription>
          <MultiSelect
            single
            values={workAuthorization ? [workAuthorization] : []}
            onValuesChange={handleTypeChange}
          >
            <MultiSelectTrigger className="w-full">
              <MultiSelectValue placeholder="Select work authorization..." />
            </MultiSelectTrigger>
            <MultiSelectContent search={{ placeholder: "Search..." }}>
              <MultiSelectGroup>
                {(WORK_AUTHORIZATION_TYPES as WorkAuthorization[]).map((auth) => (
                  <MultiSelectItem key={auth} value={auth}>
                    {auth}
                  </MultiSelectItem>
                ))}
              </MultiSelectGroup>
            </MultiSelectContent>
          </MultiSelect>
          <FieldError>{form.formState.errors.workAuthorization?.message}</FieldError>
        </Field>

        {hasType && (
          <Field>
            <FieldDescription>
              Upload copy of your {workAuthorization} document.
            </FieldDescription>
            <FileInput
              label="Choose file"
              context="compliance"
              initialFileKey={fileKey ?? undefined}
              onUploaded={handleFileUploaded}
              onFileChange={(hasFile) => !hasFile && handleFileRemoved()}
            />
          </Field>
        )}
      </FieldGroup>

      {saving && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoadingSwap isLoading>
            <span />
          </LoadingSwap>
          Saving...
        </div>
      )}
    </>
  );
}
