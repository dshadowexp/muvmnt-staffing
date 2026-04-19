"use client";

import type { ReactNode } from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRightIcon } from "lucide-react";

/**
 * Clickable action tile matching the client staff-request “Actions” cards
 * (title, description, chevron).
 */
export function ShiftActionCard({
  title,
  description,
  onClick,
  disabled,
  trailing,
}: {
  title: ReactNode;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group block w-full cursor-pointer rounded-xl text-left transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
    >
      <Card className="h-full w-full transition-shadow group-hover:shadow-md group-disabled:shadow-none">
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          {trailing ?? (
            <ArrowRightIcon className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          )}
        </CardHeader>
      </Card>
    </button>
  );
}
