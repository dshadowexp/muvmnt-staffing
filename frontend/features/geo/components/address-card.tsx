"use client";

import { useState, useEffect } from "react";
import { MapPin, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AddressInput } from "@/features/geo/components/address-input";
import { getPlaceDetails } from "@/features/geo/dal/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
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
  label = "Address",
  required,
  error,
}: AddressCardProps) {
  const [editing, setEditing] = useState(!value);
  const [searchValue, setSearchValue] = useState(value?.address ?? "");
  const [localAddress, setLocalAddress] = useState<AddressLocation | null>(null);
  const [resolving, setResolving] = useState(false);

  /**
   * Prefer `localAddress` over `value` when both exist: after a new selection, `onChange`
   * persists to the DB but `value` from the server is still stale until `router.refresh()`.
   * While resolving, keep showing the optimistic row.
   */
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
  }, [value?.id, value?.address, value?.cellId]);

  function samePersistedAddress(a: AddressLocation, b: AddressLocation) {
    return (
      a.id === b.id &&
      a.address === b.address &&
      a.cellId === b.cellId &&
      a.addressLine1 === b.addressLine1 &&
      a.addressLine2 === b.addressLine2 &&
      a.city === b.city &&
      a.adminArea === b.adminArea &&
      a.postalCode === b.postalCode &&
      a.countryCode === b.countryCode
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
    setLocalAddress(
      addressLocationFromFields(id, fields, {
        lat: value?.lat ?? 0,
        lng: value?.lng ?? 0,
      }),
    );

    try {
      const details = await getPlaceDetails(fields.placeId);

      const location = buildAddressLocation(id, details, {
        displayAddress: fields.description,
        fallback: fields,
      });
      setLocalAddress(location);
      onChange?.(location);
    } catch {
      toast.error("Could not verify address");
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
      <FieldLabel>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </FieldLabel>

      {displayed && !editing ? (
        <Card
          className={cn(
            "border-primary/25 bg-primary/5 py-0 transition-opacity",
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
                  "size-4 shrink-0 text-primary",
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
                <Spinner
                  className="size-4 text-muted-foreground"
                  aria-label="Updating address"
                />
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleEdit}
                  title="Change address"
                  aria-label="Change address"
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
              Current: <span className="text-foreground">{displayed.address}</span>
            </p>
          )}
          <AddressInput
            value={searchValue}
            onChange={setSearchValue}
            onSelect={handleSelect}
            placeholder="Start typing a new address…"
            error={error}
            suffix={
              showClose ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleClose}
                  title="Close"
                  aria-label="Close"
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
          {required ? "Required" : "Please enter a valid address"}
        </FieldError>
      )}
    </Field>
  );
}
