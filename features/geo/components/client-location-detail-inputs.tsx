"use client";

import { useEffect, useId, useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { AddressLocation } from "@/features/geo/types";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ClientLocationDetailInputsProps = {
  location: AddressLocation | null;
  /**
   * Persist updated location to the DB; return true when save succeeded.
   * Used in the dashboard profile context.
   */
  onPersist?: (next: AddressLocation) => Promise<boolean>;
  /**
   * Called with the updated location without DB persistence.
   * Used in onboarding where submission is deferred to the Continue action.
   */
  onChange?: (next: AddressLocation) => void;
  disabled?: boolean;
};

/**
 * Suite, postal code, and site instructions — same fields as client onboarding location step.
 */
export function ClientLocationDetailInputs({
  location,
  onPersist,
  onChange,
  disabled,
}: ClientLocationDetailInputsProps) {
  const baseId = useId();
  const router = useRouter();
  const t = useTranslations("kyc.onboarding.forms.address");
  const [, startTransition] = useTransition();

  const suiteRef = useRef<HTMLInputElement>(null);
  const postalCodeRef = useRef<HTMLInputElement>(null);
  const instructionsRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (suiteRef.current) suiteRef.current.value = location?.addressLine2 ?? "";
    if (postalCodeRef.current) postalCodeRef.current.value = location?.postalCode ?? "";
    if (instructionsRef.current) instructionsRef.current.value = location?.instructions ?? "";
  }, [location?.id, location?.addressLine2, location?.postalCode, location?.instructions]);

  async function handleDetailsBlur(
    field: "addressLine2" | "postalCode" | "instructions",
    value: string,
  ) {
    if (!location) return;
    const trimmed = value.trim();
    const current =
      field === "addressLine2"
        ? location.addressLine2 ?? ""
        : field === "postalCode"
          ? location.postalCode ?? ""
          : location.instructions ?? "";
    if (trimmed === current.trim()) return;

    const next: AddressLocation = {
      ...location,
      addressLine2: field === "addressLine2" ? trimmed || null : location.addressLine2,
      postalCode: field === "postalCode" ? trimmed || null : location.postalCode,
      instructions: field === "instructions" ? trimmed || null : location.instructions,
    };

    if (onChange) {
      onChange(next);
      return;
    }

    if (onPersist) {
      const ok = await onPersist(next);
      if (ok) startTransition(() => router.refresh());
    }
  }

  if (!location) return null;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
      <Field className="min-w-0">
        <FieldLabel htmlFor={`${baseId}-suite`}>{t("suiteLabel")}</FieldLabel>
        <Input
          id={`${baseId}-suite`}
          ref={suiteRef}
          defaultValue={location.addressLine2 ?? ""}
          onBlur={(e) => void handleDetailsBlur("addressLine2", e.target.value)}
          placeholder={t("suitePlaceholder")}
          autoComplete="address-line2"
          disabled={disabled}
        />
      </Field>
      <Field className="min-w-0">
        <FieldLabel htmlFor={`${baseId}-postal`}>{t("postalCodeLabel")}</FieldLabel>
        <Input
          id={`${baseId}-postal`}
          ref={postalCodeRef}
          defaultValue={location.postalCode ?? ""}
          onBlur={(e) => void handleDetailsBlur("postalCode", e.target.value)}
          placeholder={t("postalCodePlaceholder")}
          autoComplete="postal-code"
          disabled={disabled}
        />
      </Field>
      <Field className="min-w-0 sm:col-span-2">
        <FieldLabel htmlFor={`${baseId}-instructions`}>{t("instructionsLabel")}</FieldLabel>
        <Textarea
          id={`${baseId}-instructions`}
          ref={instructionsRef}
          defaultValue={location.instructions ?? ""}
          onBlur={(e) => void handleDetailsBlur("instructions", e.target.value)}
          placeholder={t("instructionsPlaceholder")}
          rows={4}
          disabled={disabled}
        />
      </Field>
    </div>
  );
}
