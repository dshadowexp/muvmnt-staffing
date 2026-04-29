"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { CircleDashedIcon, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/providers/auth-provider";

export function MenuToggle() {
  const { authUser, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const navLinks = t.raw("links") as Array<{ label: string; href: string }>;
  const isLoggedIn = !!authUser;
  const role = authUser?.role;

  return (
    <>
      {loading ? <CircleDashedIcon className="animate-spin lg:hidden" /> : (
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setOpen(!open)}
          aria-label={tCommon("toggleMenu")}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      )}

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
                <Button variant="ghost" asChild className="w-full justify-center">
                  <Link href="/sign-in" onClick={() => setOpen(false)}>
                    {t("logIn")}
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full justify-center">
                  <Link href="/request-demo" onClick={() => setOpen(false)}>
                    {t("requestDemo")}
                  </Link>
                </Button>
                <Button asChild className="w-full justify-center">
                  <Link href="/sign-up" onClick={() => setOpen(false)}>
                    {t("createFreeAccount")}
                  </Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
