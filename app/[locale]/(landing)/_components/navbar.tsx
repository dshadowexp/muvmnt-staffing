"use client";

import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { ctaPrimarySm, ctaGhostSm } from "../_lib/cta-classes";
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
    return <Link href="/dashboard" className={ctaPrimarySm}>{t("dashboard")}</Link>;
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/find-work" className={ctaGhostSm}>{t("findWork")}</Link>
      <Link href="/find-staff" className={ctaPrimarySm}>{t("requestStaff")}</Link>
    </div>
  );
}

export default function Navbar() {
  const t = useTranslations("nav");
  const navLinks = t.raw("links") as Array<{ label: string; href: string }>;

  return (
    <nav className="fixed inset-x-0 top-0 z-50 flex h-[72px] items-center justify-between border-b border-border/60 bg-background/80 px-6 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 lg:px-12">
      <Logo />

      {/* Center: primary navigation links */}
      <div className="hidden items-center gap-8 lg:flex">
        {navLinks.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className="text-sm font-medium tracking-wide text-muted-foreground no-underline transition-colors hover:text-foreground"
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Right: auth + utility controls grouped together */}
      <div className="hidden items-center gap-4 lg:flex">
        <NavbarAuthButtons />
        <div className="flex items-center gap-1.5 border-l border-border/70 pl-4">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>

      <MenuToggle />
    </nav>
  );
}
