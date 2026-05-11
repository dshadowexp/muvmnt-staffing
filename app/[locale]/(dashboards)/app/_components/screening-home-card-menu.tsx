"use client";

import { MoreHorizontalIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  screeningId: string;
};

export function ScreeningHomeCardMenu({ screeningId }: Props) {
  const t = useTranslations("dashboard.client.home.screeningCardMenu");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-8 shrink-0"
          aria-label={t("openMenu")}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <MoreHorizontalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <Link href={`/app/screenings/${screeningId}`}>{t("view")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/app/screenings/${screeningId}/edit`}>{t("edit")}</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
