"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Check, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { routing } from "@/i18n/routing";
import { controlTriggerStyles, type ControlTone } from "./control-trigger";
import { LOCALE_LABELS } from "@/lib/constants";

export function LanguageSwitcher({
  tone = "default",
}: {
  tone?: ControlTone;
  /** @deprecated use `tone` instead. Kept for backwards compat. */
  variant?: "ghost" | "outline";
}) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("common");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("switchLanguage")}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[0.7rem] font-semibold uppercase tracking-[2px] transition-colors",
            controlTriggerStyles[tone]
          )}
        >
          <Globe className="size-[14px]" />
          {locale}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-[160px] rounded-xl p-1"
      >
        {routing.locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => router.replace(pathname, { locale: loc })}
            className={cn(
              "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm",
              locale === loc && "bg-accent text-accent-foreground"
            )}
          >
            <span>{LOCALE_LABELS[loc] ?? loc}</span>
            {locale === loc && <Check className="size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
