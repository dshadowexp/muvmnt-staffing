"use client";

import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Sun } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { controlTriggerStyles, type ControlTone } from "./control-trigger";

const themes = [
  { name: "Light", Icon: Sun, value: "light" },
  { name: "Dark", Icon: Moon, value: "dark" },
  { name: "System", Icon: Monitor, value: "system" },
] as const;

export function ThemeToggle({ tone = "default" }: { tone?: ControlTone }) {
  const [mounted, setMounted] = useState(false);
  const { setTheme, theme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reserve the same footprint before mount so the navbar/footer don't shift.
  if (!mounted) {
    return (
      <div
        aria-hidden
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full border",
          controlTriggerStyles[tone]
        )}
      />
    );
  }

  const ActiveIcon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Toggle theme"
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
            controlTriggerStyles[tone]
          )}
        >
          <ActiveIcon className="size-[14px]" />
          <span className="sr-only">Toggle theme</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-[160px] rounded-xl p-1"
      >
        {themes.map(({ name, Icon, value }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm",
              theme === value && "bg-accent text-accent-foreground"
            )}
          >
            <span className="flex items-center gap-2">
              <Icon className="size-4" />
              {name}
            </span>
            {theme === value && <Check className="size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}