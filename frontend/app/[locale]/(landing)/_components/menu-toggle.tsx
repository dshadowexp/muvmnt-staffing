"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NAV_LINKS } from "@/lib/constants";

interface MenuToggleProps {
  isLoggedIn: boolean;
}

export function MenuToggle({ isLoggedIn }: MenuToggleProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      {open && (
        <div className="fixed inset-x-0 top-[72px] z-50 border-b border-border bg-background p-6 shadow-lg lg:hidden">
          <nav className="flex flex-col gap-4">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className="text-base font-medium text-muted-foreground no-underline transition-colors hover:text-primary"
              >
                {label}
              </Link>
            ))}

            {isLoggedIn ? (
              <Button asChild className="w-full justify-center">
                <Link href="/app" onClick={() => setOpen(false)}>
                  Dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="outline" asChild className="w-full justify-center">
                  <Link href="/find-work" onClick={() => setOpen(false)}>
                    Find Work
                  </Link>
                </Button>
                <Button asChild className="w-full justify-center">
                  <Link href="/find-talent" onClick={() => setOpen(false)}>
                    Find Talent →
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
