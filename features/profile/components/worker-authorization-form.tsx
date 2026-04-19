"use client";

import { CheckCircle2, CircleDashed } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface WorkerAuthorizationFormProps {
  initialWorkAuthorization?:
    | { type: string; file_url: string }
    | null;
  /** When true, work authorization cannot be changed. */
  workAuthorizationVerified?: boolean;
  /**
   * Worker profile: start in read-only summary; user must choose edit before
   * changing type or document. Ignored when {@link workAuthorizationVerified}.
   */
  profileEditMode?: boolean;
  /** When `profileEditMode` is true and not verified, whether the editable form is shown. */
  isEditing?: boolean;
  /** Called when the user cancels edit (profile only). */
  onCancelEdit?: () => void;
}

export function WorkerAuthorizationForm({
  initialWorkAuthorization,
  workAuthorizationVerified = false,
  profileEditMode = false,
  isEditing = false,
  onCancelEdit,
}: WorkerAuthorizationFormProps) {
  const [fileKey, setFileKey] = useState<string | null>(
    initialWorkAuthorization?.file_url ?? null
  );
  const [saving, setSaving] = useState(false);
  const t = useTranslations("kyc.onboarding.forms.authorization");
  const tCommon = useTranslations("common");
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

  /** Profile: editable UI only while editing. Onboarding: always editable when not verified. */
  const inEditUI =
    !workAuthorizationVerified &&
    (!profileEditMode || isEditing);

  useEffect(() => {
    if (!inEditUI) return;
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
    inEditUI,
    workAuthorizationVerified,
    canSave,
    isUnchanged,
    workAuthorization,
    fileKey,
  ]);

  const wasEditingRef = useRef(false);
  useEffect(() => {
    const enteredEdit =
      profileEditMode && isEditing && !wasEditingRef.current;
    wasEditingRef.current = isEditing;
    if (!enteredEdit) return;
    setFileKey(initialWorkAuthorization?.file_url ?? null);
    setValue(
      "workAuthorization",
      (initialWorkAuthorization?.type ?? "") as WorkAuthorization,
      { shouldValidate: false },
    );
  }, [
    profileEditMode,
    isEditing,
    initialWorkAuthorization?.type,
    initialWorkAuthorization?.file_url,
    setValue,
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
        <Field>
          <FieldLabel>{t("verificationLabel")}</FieldLabel>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2
              className="size-4 shrink-0 text-emerald-600"
              aria-hidden
            />
            <span>{t("verificationStatusVerified")}</span>
          </div>
        </Field>
        <p className="text-muted-foreground text-sm">{t("verifiedNotice")}</p>
      </FieldGroup>
    );
  }

  if (profileEditMode && !inEditUI) {
    const hasDoc = !!initialWorkAuthorization?.file_url;
    return (
      <dl className="grid gap-3 text-sm sm:grid-cols-[minmax(8rem,10rem)_1fr] sm:gap-x-4">
        <dt className="text-muted-foreground font-medium">{t("typeLabel")}</dt>
        <dd>{initialWorkAuthorization?.type || "—"}</dd>
        <dt className="text-muted-foreground font-medium">
          {t("documentLabel")}
        </dt>
        <dd>
          {hasDoc ? t("documentOnFile") : t("none")}
        </dd>
        <dt className="text-muted-foreground font-medium">
          {t("verificationLabel")}
        </dt>
        <dd>
          {hasDoc ? (
            <span className="inline-flex items-center gap-2">
              <CircleDashed
                className="size-4 shrink-0 animate-spin text-muted-foreground"
                aria-hidden
              />
              <span>{t("verificationStatusPending")}</span>
            </span>
          ) : (
            t("none")
          )}
        </dd>
      </dl>
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

      {profileEditMode && isEditing && onCancelEdit ? (
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setFileKey(initialWorkAuthorization?.file_url ?? null);
              setValue(
                "workAuthorization",
                (initialWorkAuthorization?.type ?? "") as WorkAuthorization,
                { shouldValidate: true },
              );
              onCancelEdit();
            }}
          >
            {tCommon("cancel")}
          </Button>
        </div>
      ) : null}

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
