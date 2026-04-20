"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { UserRole } from "@/types/auth";

interface MenuToggleProps {
  isLoggedIn: boolean;
  role?: UserRole;
}

export function MenuToggle({ isLoggedIn, role }: MenuToggleProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const navLinks = t.raw("links") as Array<{ label: string; href: string }>;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setOpen(!open)}
        aria-label={tCommon("toggleMenu")}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      {open && (
        <div className="fixed inset-x-0 top-[72px] z-50 border-b border-border bg-background p-6 shadow-lg lg:hidden">
          <nav className="flex flex-col gap-4">
            {navLinks.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="text-base font-medium text-muted-foreground no-underline transition-colors hover:text-primary"
              >
                {label}
              </Link>
            ))}

            {isLoggedIn && role ? (
              <Button asChild className="w-full justify-center">
                <Link href={`/dashboard`} onClick={() => setOpen(false)}>
                  {t("dashboard")}
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild className="w-full justify-center">
                  <Link href="/find-staff" onClick={() => setOpen(false)}>
                    {t("requestStaff")} →
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full justify-center">
                  <Link href="/find-work" onClick={() => setOpen(false)}>
                    {t("findWork")}
                  </Link>
                </Button>
              </>
            )}

            <Separator />

            <div className="flex items-center justify-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
