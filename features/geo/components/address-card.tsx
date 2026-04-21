"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Pencil, X, CircleDashedIcon } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { AddressInput } from "@/features/geo/components/address-input";
import { getPlaceDetails } from "@/features/geo/dal/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  addressLocationFromFields,
  buildAddressLocation,
} from "@/features/geo/lib/build-address-location";
import type { AddressFields, AddressLocation } from "@/features/geo/types";

interface AddressCardProps {
  value?: AddressLocation | null;
  onChange?: (location: AddressLocation) => void;
  label?: string;
  required?: boolean;
  error?: boolean;
}

export function AddressCard({
  value,
  onChange,
  label,
  required,
  error,
}: AddressCardProps) {
  const [editing, setEditing] = useState(!value);
  const [searchValue, setSearchValue] = useState(value?.address ?? "");
  const [localAddress, setLocalAddress] = useState<AddressLocation | null>(null);
  const [resolving, setResolving] = useState(false);
  const t = useTranslations("kyc.onboarding.forms.address");
  const sessionToken = useRef(crypto.randomUUID());
  
  const displayed =
    resolving && localAddress
      ? localAddress
      : (localAddress ?? value ?? null);

  useEffect(() => {
    setSearchValue(value?.address ?? "");
    setEditing(!value);
    if (!value) {
      setLocalAddress(null);
    }
  }, [value?.id, value?.address]);

  function samePersistedAddress(a: AddressLocation, b: AddressLocation) {
    return (
      a.id === b.id &&
      a.address === b.address &&
      a.addressLine1 === b.addressLine1 &&
      a.addressLine2 === b.addressLine2 &&
      a.city === b.city &&
      a.adminArea === b.adminArea &&
      a.postalCode === b.postalCode &&
      a.countryCode === b.countryCode &&
      a.instructions === b.instructions
    );
  }

  // Once the server props catch up after refresh, drop redundant local copy
  useEffect(() => {
    if (!value || !localAddress) return;
    if (samePersistedAddress(value, localAddress)) {
      setLocalAddress(null);
    }
  }, [value, localAddress]);

  async function handleSelect(fields: AddressFields) {
    setSearchValue(fields.description);
    setEditing(false);
    setResolving(true);

    const id = value?.id ?? crypto.randomUUID();
    const optimistic = addressLocationFromFields(id, fields, {
      lat: value?.lat ?? 0,
      lng: value?.lng ?? 0,
    });
    setLocalAddress({
      ...optimistic,
      addressLine2: value?.addressLine2 ?? null,
      instructions: value?.instructions ?? null,
    });

    try {
      const details = await getPlaceDetails(fields.placeId, sessionToken.current);

      const built = buildAddressLocation(id, details, {
        displayAddress: fields.description,
        fallback: fields,
      });
      const location: AddressLocation = {
        ...built,
        addressLine2: value?.addressLine2 ?? null,
        instructions: value?.instructions ?? null,
      };
      setLocalAddress(location);
      onChange?.(location);
    } catch {
      toast.error(t("verifyFailed"));
      if (value) {
        setLocalAddress(null);
        setEditing(false);
        setSearchValue(value.address);
      } else {
        setLocalAddress(null);
        setEditing(true);
        setSearchValue(fields.description);
      }
    } finally {
      setResolving(false);
    }
  }

  function handleEdit() {
    setEditing(true);
    setSearchValue("");
  }

  function handleClose() {
    if (displayed) {
      setEditing(false);
    } else {
      setSearchValue("");
    }
  }

  const showClose = displayed || searchValue.length > 0;

  return (
    <Field data-invalid={!!error} className="w-full">
      {label && (
        <FieldLabel>
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </FieldLabel>
      )}

      {displayed && !editing ? (
        <Card
          className={cn(
            "border-primary/25 py-0 transition-opacity",
            error && "border-destructive/50",
          )}
          aria-busy={resolving}
        >
          <CardContent
            className={cn(
              "flex items-center justify-between gap-3 py-2.5 px-4 transition-opacity",
              resolving && "opacity-60",
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <MapPin
                className={cn(
                  "size-4 shrink-0",
                  resolving && "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "min-w-0 truncate text-sm",
                  resolving ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {displayed.address}
              </span>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center">
              {resolving ? (
                <CircleDashedIcon
                  className="size-4 text-muted-foreground"
                  aria-label={t("updatingAddress")}
                />
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleEdit}
                  title={t("changeAddress")}
                  aria-label={t("changeAddress")}
                >
                  <Pencil className="size-3.5" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayed && (
            <p className="text-sm text-muted-foreground">
              {t("currentPrefix")}
              <span className="text-foreground">{displayed.address}</span>
            </p>
          )}
          <AddressInput
            value={searchValue}
            onChange={setSearchValue}
            onSelect={handleSelect}
            placeholder={t("placeholder")}
            error={error}
            suffix={
              showClose ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleClose}
                  title={t("close")}
                  aria-label={t("close")}
                >
                  <X className="size-3.5" />
                </Button>
              ) : undefined
            }
          />
        </div>
      )}

      {error && (
        <FieldError>
          {required ? t("required") : t("invalid")}
        </FieldError>
      )}
    </Field>
  );
}
