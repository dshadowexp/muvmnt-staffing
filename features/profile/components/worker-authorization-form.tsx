"use client";

import { CalendarIcon, CheckCircle2, Lock } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { WORK_AUTHORIZATION_TYPES } from "@/lib/constants";
import type { WorkAuthorization } from "@/types";
import { cn } from "@/lib/utils";
import {
  buildAuthorizationSchema,
  canEditSocialNumber,
  formatSocialNumber,
  maskSocialNumber,
  normalizeSocialNumber,
  requiresSinExpiry,
  type AuthorizationFormValues,
} from "@/features/profile/schemas/authorization";
import { upsertWorkAuthorizationAction } from "@/features/profile/actions/authorization-actions";
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
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/providers/auth-provider";

interface InitialWorkAuthorization {
  type: string;
  file_url?: string | null;
  social_number?: string | null;
  social_number_expiry?: string | null;
}

interface WorkerAuthorizationFormProps {
  initialWorkAuthorization?: InitialWorkAuthorization | null;
  /** When true, work authorization cannot be changed. */
  workAuthorizationVerified?: boolean;
  /**
   * When true (dashboard profile), a persisted SIN follows {@link canEditSocialNumber}
   * (locked except permit renewal). When false (onboarding), the SIN field stays editable.
   */
  enforcePersistedSocialNumberLock?: boolean;
  /**
   * Worker profile: start in read-only summary; user must choose edit before
   * changing type or document. Ignored when {@link workAuthorizationVerified}.
   */
  profileEditMode?: boolean;
  /** When `profileEditMode` is true and not verified, whether the editable form is shown. */
  isEditing?: boolean;
  /** Called when the user cancels edit (profile only). */
  onCancelEdit?: () => void;
  /** Disables inputs while the parent form is submitting (e.g. onboarding Continue). */
  submitting?: boolean;
}

/** Onboarding Continue: validate, persist, then run the step server action. */
export type WorkerAuthorizationFormHandle = {
  prepareForContinue: () => Promise<boolean>;
};

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export const WorkerAuthorizationForm = forwardRef<
  WorkerAuthorizationFormHandle,
  WorkerAuthorizationFormProps
>(function WorkerAuthorizationForm(
  {
    initialWorkAuthorization,
    workAuthorizationVerified = false,
    enforcePersistedSocialNumberLock = true,
    profileEditMode = false,
    isEditing = false,
    onCancelEdit,
    submitting = false,
  },
  ref,
) {
  const { loading: authLoading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [expiryOpen, setExpiryOpen] = useState(false);
  const t = useTranslations("kyc.onboarding.forms.authorization");
  const tCommon = useTranslations("common");
  const tVal = useTranslations("kyc.onboarding.validation");
  const tOnboardingErrors = useTranslations("kyc.onboarding.errors");
  const schema = useMemo(() => buildAuthorizationSchema(tVal), [tVal]);

  const initialSin = normalizeSocialNumber(
    initialWorkAuthorization?.social_number,
  );
  const initialExpiry = initialWorkAuthorization?.social_number_expiry ?? "";

  const form = useForm<AuthorizationFormValues>({
    defaultValues: {
      workAuthorization: (initialWorkAuthorization?.type ?? "") as WorkAuthorization,
      socialNumber: initialSin,
      socialNumberExpiry: initialExpiry,
    },
    resolver: zodResolver(schema),
    mode: "onBlur",
  });

  const { setValue, watch, trigger, getValues, formState } = form;
  const workAuthorization = watch("workAuthorization");
  const socialNumberRaw = watch("socialNumber") ?? "";
  const socialNumberExpiry = watch("socialNumberExpiry") ?? "";

  const socialNumber = normalizeSocialNumber(socialNumberRaw);
  const needsExpiry = requiresSinExpiry(workAuthorization);
  const sinLocked =
    enforcePersistedSocialNumberLock &&
    !canEditSocialNumber({
      socialNumber: initialSin,
      socialNumberExpiry: initialExpiry || null,
    });

  const hasType = !!workAuthorization;
  const hasValidSin = socialNumber.length === 9;
  const hasValidExpiry = !needsExpiry || (() => {
    if (!socialNumberExpiry) return false;
    const parsed = parseLocalDate(socialNumberExpiry);
    if (Number.isNaN(parsed.getTime())) return false;
    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    return parsed >= todayStart;
  })();
  const canSave = hasType && hasValidSin && hasValidExpiry;

  const isUnchanged =
    initialWorkAuthorization &&
    workAuthorization === initialWorkAuthorization.type &&
    socialNumber === initialSin &&
    (socialNumberExpiry ?? "") === (initialExpiry ?? "");

  /** Profile: editable UI only while editing. Onboarding: always editable when not verified. */
  const inEditUI =
    !workAuthorizationVerified && (!profileEditMode || isEditing);

  const inputsDisabled =
    inEditUI && (saving || submitting || authLoading);

  useEffect(() => {
    if (inputsDisabled) setExpiryOpen(false);
  }, [inputsDisabled]);

  useImperativeHandle(
    ref,
    () => ({
      async prepareForContinue() {
        if (workAuthorizationVerified) return true;
        if (!inEditUI) return true;

        const fieldsValid = await trigger(undefined, { shouldFocus: true });
        if (!fieldsValid) return false;

        const type = getValues("workAuthorization") as WorkAuthorization;
        const sn = normalizeSocialNumber(getValues("socialNumber"));
        const exp = getValues("socialNumberExpiry") ?? "";
        const expRequired = requiresSinExpiry(type);

        const { error, message } = await upsertWorkAuthorizationAction({
          type,
          socialNumber: sn,
          socialNumberExpiry: expRequired ? exp : null,
        });
        if (error) {
          toast.error(message);
          return false;
        }
        return true;
      },
    }),
    [
      workAuthorizationVerified,
      inEditUI,
      trigger,
      getValues,
    ],
  );

  useEffect(() => {
    if (!inEditUI) return;
    if (workAuthorizationVerified) return;
    if (!canSave || isUnchanged) return;

    let cancelled = false;
    async function save() {
      setSaving(true);
      const { error, message } = await upsertWorkAuthorizationAction({
        type: workAuthorization,
        socialNumber,
        socialNumberExpiry: needsExpiry ? socialNumberExpiry : null,
      });
      if (cancelled) return;
      setSaving(false);
      if (error) {
        toast.error(message);
      } else {
        toast.success(message);
      }
    }
    save();
    return () => {
      cancelled = true;
    };
  }, [
    inEditUI,
    workAuthorizationVerified,
    canSave,
    isUnchanged,
    workAuthorization,
    socialNumber,
    socialNumberExpiry,
    needsExpiry,
  ]);

  const wasEditingRef = useRef(false);
  useEffect(() => {
    const enteredEdit =
      profileEditMode && isEditing && !wasEditingRef.current;
    wasEditingRef.current = isEditing;
    if (!enteredEdit) return;
    setValue(
      "workAuthorization",
      (initialWorkAuthorization?.type ?? "") as WorkAuthorization,
      { shouldValidate: false },
    );
    setValue("socialNumber", initialSin, { shouldValidate: false });
    setValue("socialNumberExpiry", initialExpiry, { shouldValidate: false });
  }, [
    profileEditMode,
    isEditing,
    initialWorkAuthorization?.type,
    initialSin,
    initialExpiry,
    setValue,
  ]);

  function handleTypeChange(values: string[]) {
    const newType = (values[0] ?? "") as WorkAuthorization;
    setValue("workAuthorization", newType, { shouldValidate: true });
    if (!requiresSinExpiry(newType)) {
      setValue("socialNumberExpiry", "", { shouldValidate: true });
    }
  }

  function handleSocialNumberChange(raw: string) {
    const digits = normalizeSocialNumber(raw).slice(0, 9);
    setValue("socialNumber", digits, { shouldValidate: false });
    if (digits.length === 9) {
      void trigger("socialNumber");
    }
  }

  function handleSocialNumberBlur() {
    void trigger("socialNumber");
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
          <FieldLabel>{t("socialNumberLabel")}</FieldLabel>
          <p className="text-sm">{maskSocialNumber(initialSin) || t("none")}</p>
        </Field>
        {initialExpiry ? (
          <Field>
            <FieldLabel>{t("socialNumberExpiryLabel")}</FieldLabel>
            <p className="text-sm">
              {format(parseLocalDate(initialExpiry), "PPP")}
            </p>
          </Field>
        ) : null}
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
    return (
      <dl className="grid gap-3 text-sm sm:grid-cols-[minmax(8rem,10rem)_1fr] sm:gap-x-4">
        <dt className="text-muted-foreground font-medium">{t("typeLabel")}</dt>
        <dd>{initialWorkAuthorization?.type || "—"}</dd>
        <dt className="text-muted-foreground font-medium">
          {t("socialNumberLabel")}
        </dt>
        <dd>{maskSocialNumber(initialSin) || t("none")}</dd>
        {initialExpiry ? (
          <>
            <dt className="text-muted-foreground font-medium">
              {t("socialNumberExpiryLabel")}
            </dt>
            <dd>{format(parseLocalDate(initialExpiry), "PPP")}</dd>
          </>
        ) : null}
      </dl>
    );
  }

  return (
    <>
      <FieldGroup>
        <Field data-invalid={!!formState.errors.workAuthorization}>
          <FieldLabel>{t("typeLabel")}</FieldLabel>
          <FieldDescription>{t("typeDescription")}</FieldDescription>
          <MultiSelect
            single
            values={workAuthorization ? [workAuthorization] : []}
            onValuesChange={handleTypeChange}
          >
            <MultiSelectTrigger className="w-full" disabled={inputsDisabled}>
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
          <FieldError>
            {formState.errors.workAuthorization?.message}
          </FieldError>
        </Field>

        <Field data-invalid={!!formState.errors.socialNumber}>
          <FieldLabel htmlFor="worker-sin">{t("socialNumberLabel")}</FieldLabel>
          <FieldDescription>
            {sinLocked
              ? t("socialNumberLockedDescription")
              : t("socialNumberDescription")}
          </FieldDescription>
          <div className="relative">
            <Input
              id="worker-sin"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder={t("socialNumberPlaceholder")}
              maxLength={11}
              disabled={sinLocked || inputsDisabled}
              value={
                sinLocked
                  ? maskSocialNumber(initialSin)
                  : formatSocialNumber(socialNumberRaw)
              }
              onChange={(e) => handleSocialNumberChange(e.target.value)}
              onBlur={
                sinLocked || inputsDisabled ? undefined : handleSocialNumberBlur
              }
            />
            {sinLocked ? (
              <Lock
                className="text-muted-foreground absolute right-3 top-1/2 size-4 -translate-y-1/2"
                aria-hidden
              />
            ) : null}
          </div>
          <FieldError>{formState.errors.socialNumber?.message}</FieldError>
        </Field>

        {needsExpiry && (
          <Field data-invalid={!!formState.errors.socialNumberExpiry}>
            <FieldLabel htmlFor="worker-sin-expiry">
              {t("socialNumberExpiryLabel")}
            </FieldLabel>
            <FieldDescription>
              {t("socialNumberExpiryDescription")}
            </FieldDescription>
            <Popover open={expiryOpen} onOpenChange={setExpiryOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="worker-sin-expiry"
                  type="button"
                  variant="outline"
                  disabled={inputsDisabled}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !socialNumberExpiry && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {socialNumberExpiry
                    ? format(parseLocalDate(socialNumberExpiry), "PPP")
                    : t("socialNumberExpiryPlaceholder")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    socialNumberExpiry
                      ? parseLocalDate(socialNumberExpiry)
                      : undefined
                  }
                  defaultMonth={
                    socialNumberExpiry
                      ? parseLocalDate(socialNumberExpiry)
                      : undefined
                  }
                  onSelect={(d) => {
                    setValue(
                      "socialNumberExpiry",
                      d ? format(d, "yyyy-MM-dd") : "",
                      { shouldValidate: true },
                    );
                    setExpiryOpen(false);
                  }}
                  disabled={(d) => {
                    const day = new Date(
                      d.getFullYear(),
                      d.getMonth(),
                      d.getDate(),
                    );
                    const today = new Date();
                    const todayStart = new Date(
                      today.getFullYear(),
                      today.getMonth(),
                      today.getDate(),
                    );
                    return day < todayStart;
                  }}
                  captionLayout="dropdown"
                  fromYear={new Date().getFullYear()}
                  toYear={new Date().getFullYear() + 20}
                />
              </PopoverContent>
            </Popover>
            <FieldError>
              {formState.errors.socialNumberExpiry?.message}
            </FieldError>
          </Field>
        )}
      </FieldGroup>

      {profileEditMode && isEditing && onCancelEdit ? (
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={inputsDisabled}
            onClick={() => {
              setValue(
                "workAuthorization",
                (initialWorkAuthorization?.type ?? "") as WorkAuthorization,
                { shouldValidate: true },
              );
              setValue("socialNumber", initialSin, { shouldValidate: true });
              setValue("socialNumberExpiry", initialExpiry, {
                shouldValidate: true,
              });
              onCancelEdit();
            }}
          >
            {tCommon("cancel")}
          </Button>
        </div>
      ) : null}

      {inEditUI && (saving || submitting || authLoading) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoadingSwap isLoading>
            <span />
          </LoadingSwap>
          {t("saving")}
        </div>
      )}
    </>
  );
});

WorkerAuthorizationForm.displayName = "WorkerAuthorizationForm";
