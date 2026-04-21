"use client";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { MenuToggle } from "./menu-toggle";
import { Logo } from "@/components/logo";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTranslations } from "next-intl";
import { CircleDashedIcon } from "lucide-react";

function NavbarAuthButtons() {
  const { authUser, loading } = useAuth();
  const t = useTranslations("nav");

  if (loading) return <CircleDashedIcon className="animate-spin" />;

  if (authUser) {
    return (
      <Button size="sm" asChild>
        <Link href={`/dashboard`}>{t("dashboard")}</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/find-work">{t("findWork")}</Link>
      </Button>
      <Button size="sm" asChild>
        <Link href="/find-staff">{t("requestStaff")}</Link>
      </Button>
    </div>
  );
}

export default function Navbar() {
  const t = useTranslations("nav");
  const navLinks = t.raw("links") as Array<{ label: string; href: string }>;

  return (
    <nav className="fixed inset-x-0 top-0 z-50 flex h-[72px] items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur-sm lg:px-12">
      <Logo />

      <div className="hidden items-center gap-9 lg:flex">
        {navLinks.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className="text-sm font-medium tracking-wide text-muted-foreground no-underline transition-colors hover:text-primary"
          >
            {label}
          </Link>
        ))}

        <Separator orientation="vertical" className="h-5" />

        <NavbarAuthButtons />

        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>

      <MenuToggle />
    </nav>
  );
}
