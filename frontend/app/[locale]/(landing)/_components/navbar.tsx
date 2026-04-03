import { Suspense } from "react";
import Link from "next/link";
import { NAV_LINKS } from "@/lib/constants";
import { getSession } from "@/lib/get-session";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { MenuToggle } from "./menu-toggle";
import { Logo } from "@/components/logo";
import { Spinner } from "@/components/ui/spinner";

async function NavbarAuthButtons() {
  const session = await getSession();
  return session ? (
    <Button size="sm" asChild>
      <Link href="/app">Dashboard</Link>
    </Button>
  ) : (
    <Button variant="outline" size="sm" asChild>
      <Link href="/find-work">Find Work</Link>
    </Button>
  );
}

async function NavbarMobileMenu() {
  const session = await getSession();
  return <MenuToggle isLoggedIn={!!session} />;
}

export default function Navbar() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 flex h-[72px] items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur-sm lg:px-12">
      <Logo />

      <div className="hidden items-center gap-9 lg:flex">
        {NAV_LINKS.map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            className="text-sm font-medium tracking-wide text-muted-foreground no-underline transition-colors hover:text-primary"
          >
            {label}
          </Link>
        ))}

        <Separator orientation="vertical" className="h-5" />

        <Suspense
          fallback={
            <div className="flex h-9 min-w-[7rem] items-center justify-center">
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
