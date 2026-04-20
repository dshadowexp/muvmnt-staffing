import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSession } from "@/lib/get-session";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { MenuToggle } from "./menu-toggle";
import { Logo } from "@/components/logo";
import { Spinner } from "@/components/ui/spinner";

async function NavbarAuthButtons() {
  const [session, t] = await Promise.all([getSession(), getTranslations("nav")]);
  if (session) {
    return (
      <Button size="sm" asChild>
        <Link href={`/${session.role}`}>{t("dashboard")}</Link>
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

async function NavbarMobileMenu() {
  const session = await getSession();
  return <MenuToggle isLoggedIn={!!session} role={session?.role} />;
}

export default async function Navbar() {
  const t = await getTranslations("nav");
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

        <Suspense
          fallback={
            <div className="flex h-9 min-w-[10rem] items-center justify-center">
              <Spinner />
            </div>
          }
        >
          <NavbarAuthButtons />
        </Suspense>

        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>

      <Suspense
        fallback={
          <div
            className="flex size-9 items-center justify-center lg:hidden"
            aria-busy
            aria-label="Loading session"
          >
            <Spinner />
          </div>
        }
      >
        <NavbarMobileMenu />
      </Suspense>
    </nav>
  );
}
