"use client";

import * as React from "react";
import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Accessible 1–5 star rating. Purely presentational — parent owns the value.
 * Interactive by default; pass `readOnly` to render a static display.
 */
export function StarRating({
  value,
  onChange,
  size = 28,
  readOnly = false,
  disabled = false,
  className,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  readOnly?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const active = hover ?? value;

  return (
    <div
      role={readOnly ? undefined : "radiogroup"}
      aria-label="Star rating"
      className={cn("flex items-center gap-1", className)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = active >= star;
        return (
          <button
            key={star}
            type="button"
            role={readOnly ? undefined : "radio"}
            aria-checked={readOnly ? undefined : value === star}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            disabled={readOnly || disabled}
            onMouseEnter={() => !readOnly && !disabled && setHover(star)}
            onMouseLeave={() => !readOnly && !disabled && setHover(null)}
            onFocus={() => !readOnly && !disabled && setHover(star)}
            onBlur={() => !readOnly && !disabled && setHover(null)}
            onClick={() => !readOnly && !disabled && onChange?.(star)}
            className={cn(
              "rounded transition-transform",
              !readOnly && !disabled && "hover:scale-110 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
              (readOnly || disabled) && "cursor-default",
            )}
          >
            <StarIcon
              width={size}
              height={size}
              className={cn(
                filled ? "fill-amber-400 text-amber-400" : "fill-transparent text-muted-foreground",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
