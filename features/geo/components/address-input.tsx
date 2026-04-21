"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import { CircleDashedIcon, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchAddresses } from "@/features/geo/dal/queries";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import type { ReactNode } from "react";
import { AddressFields } from "../types";

export interface AddressSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (fields: AddressFields) => void;
  placeholder?: string;
  error?: boolean;
  className?: string;
  suffix?: ReactNode;
  sessionToken?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AddressInput({
  value,
  onChange,
  onSelect,
  placeholder = "Start typing an address…",
  error,
  className,
  suffix,
  sessionToken,
}: AddressInputProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const [dropdownRect, setDropdownRect] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  const updateDropdownPosition = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDropdownRect({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      const results = await searchAddresses(input, sessionToken);
      setSuggestions(results);
      setOpen(results.length > 0);
    } catch {
      setSuggestions([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelect = (suggestion: AddressSuggestion) => {
    onChange(suggestion.description);
    setOpen(false);
    setSuggestions([]);

    const parts = parseDescription(suggestion);
    onSelect({
      addressLine1: parts.addressLine1,
      city:         parts.city,
      province:     parts.province,
      postalCode:   parts.postalCode,
      placeId:      suggestion.placeId,
      description:  suggestion.description,
    });
  };

  const displayed = suggestions.slice(0, 4);

  useLayoutEffect(() => {
    if (!open || suggestions.length === 0) return;
    updateDropdownPosition();
  }, [open, suggestions.length, updateDropdownPosition]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updateDropdownPosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updateDropdownPosition]);

  // Close on outside click (input + portaled list)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapperRef.current?.contains(t)) return;
      if (dropdownRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full min-w-0 max-w-full">
      <InputGroup className={cn(className)}>
        <InputGroupAddon align="inline-start">
          <Search className="size-4 text-muted-foreground" />
        </InputGroupAddon>
        <InputGroupInput
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          autoComplete="off"
          data-invalid={error}
          aria-invalid={error}
          aria-busy={loading}
          onFocus={() => {
            if (displayed.length > 0) setOpen(true);
          }}
        />
        {(loading || suffix) && (
          <InputGroupAddon align="inline-end">
            {loading ? (
              <span
                className="inline-flex items-center justify-center"
                aria-label="Loading suggestions"
                role="status"
              >
                <CircleDashedIcon className="size-4 text-muted-foreground" />
              </span>
            ) : (
              suffix
            )}
          </InputGroupAddon>
        )}
      </InputGroup>

      {typeof document !== "undefined" &&
        open &&
        displayed.length > 0 &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[100] max-h-[min(40vh,320px)] overflow-y-auto rounded-lg border border-border bg-popover shadow-lg"
            style={{
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
            }}
          >
            {displayed.map((s, i) => (
              <button
                key={s.placeId}
                type="button"
                className={cn(
                  "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors",
                  "hover:bg-muted/80",
                  hoveredIdx === i && "bg-muted/80",
                  i < displayed.length - 1 && "border-b border-border",
                )}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(-1)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(s);
                }}
              >
                <span className="text-sm font-medium text-foreground">
                  {s.mainText}
                </span>
                <span className="text-xs text-muted-foreground">
                  {s.secondaryText}
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
// ─── Parse Google description into structured fields ──────────────────────────

function parseDescription(suggestion: AddressSuggestion): {
  addressLine1: string;
  city:         string;
  province:     string;
  postalCode:   string;
} {
  // mainText is typically the street address, secondaryText is "City, Province, Country"
  const addressLine1 = suggestion.mainText || "";
  const secondary = suggestion.secondaryText || "";
  const parts = secondary.split(",").map((p: string) => p.trim());

  const city     = parts[0] || "";
  const province = parts[1] || "";

  // Google rarely includes postal code in autocomplete suggestions;
  // we return empty and the parent can ask for it manually or fetch via place details.
  return { addressLine1, city, province, postalCode: "" };
}

