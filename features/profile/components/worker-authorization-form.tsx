"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { WORK_AUTHORIZATION_TYPES } from "@/lib/constants";
import type { WorkAuthorization } from "@/types";
import {
  buildAuthorizationSchema,
  type AuthorizationFormValues,
} from "@/features/profile/schemas/authorization";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface WorkerAuthorizationFormProps {
  initialWorkAuthorization?:
    | { type: string; file_url: string }
    | null;
  /** When true, work authorization cannot be changed. */
  workAuthorizationVerified?: boolean;
}

export function WorkerAuthorizationForm({
  initialWorkAuthorization,
  workAuthorizationVerified = false,
}: WorkerAuthorizationFormProps) {
  const [fileKey, setFileKey] = useState<string | null>(
    initialWorkAuthorization?.file_url ?? null
  );
  const [saving, setSaving] = useState(false);
  const t = useTranslations("kyc.onboarding.forms.authorization");
  const tVal = useTranslations("kyc.onboarding.validation");
  const schema = useMemo(() => buildAuthorizationSchema(tVal), [tVal]);

  const form = useForm<AuthorizationFormValues>({
    defaultValues: {
      workAuthorization: (initialWorkAuthorization?.type ?? "") as WorkAuthorization,
    },
    resolver: zodResolver(schema),
  });

  const { setValue, watch } = form;
  const workAuthorization = watch("workAuthorization");

  const hasType = !!workAuthorization;
  const hasFile = !!fileKey;
  const canSave = hasType && hasFile;

  const isUnchanged =
    initialWorkAuthorization &&
    workAuthorization === initialWorkAuthorization.type &&
    fileKey === initialWorkAuthorization.file_url;

  useEffect(() => {
    if (workAuthorizationVerified) return;
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
  }, [
    workAuthorizationVerified,
    canSave,
    isUnchanged,
    workAuthorization,
    fileKey,
  ]);

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
        toast.error(t("removeFileFailed"));
      }

      const { error, message } = await deleteWorkAuthorizationAction();
      if (error) toast.error(message);
    }
  }

  if (workAuthorizationVerified) {
    return (
      <FieldGroup>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{t("verifiedBadge")}</Badge>
          <span className="text-muted-foreground text-sm">
            {t("verifiedNotice")}
          </span>
        </div>
        <Field>
          <FieldLabel>{t("typeLabel")}</FieldLabel>
          <p className="text-sm">
            {initialWorkAuthorization?.type ?? t("none")}
          </p>
        </Field>
        <Field>
          <FieldLabel>{t("documentLabel")}</FieldLabel>
          <p className="text-sm">
            {fileKey ? t("documentOnFile") : t("none")}
          </p>
        </Field>
      </FieldGroup>
    );
  }

  return (
    <>
      <FieldGroup>
        <Field data-invalid={!!form.formState.errors.workAuthorization}>
          <FieldLabel>{t("typeLabel")}</FieldLabel>
          <FieldDescription>{t("typeDescription")}</FieldDescription>
          <MultiSelect
            single
            values={workAuthorization ? [workAuthorization] : []}
            onValuesChange={handleTypeChange}
          >
            <MultiSelectTrigger className="w-full">
              <MultiSelectValue placeholder={t("typePlaceholder")} />
            </MultiSelectTrigger>
            <MultiSelectContent search={{ placeholder: t("typeSearch") }}>
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
              {t("uploadDescription", { type: workAuthorization })}
            </FieldDescription>
            <FileInput
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
          {t("saving")}
        </div>
      )}
    </>
  );
}
