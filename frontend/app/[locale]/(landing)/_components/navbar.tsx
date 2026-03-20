import Link from "next/link";
import { NAV_LINKS } from "@/lib/constants";
import { getSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { MenuToggle } from "./menu-toggle";
import { Logo } from "@/components/logo";

export default async function Navbar() {
  const session = await getSession();
  const isLoggedIn = !!session;

  return (
    <nav className="fixed inset-x-0 top-0 z-50 flex h-[72px] items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur-sm lg:px-12">
      {/* Logo */}
      <Logo />

      {/* Desktop links + actions */}
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

        {isLoggedIn ? (
          <Button size="sm" asChild>
            <Link href="/app">Dashboard</Link>
          </Button>
        ) : (
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/find-work">Find Work</Link>
            </Button>
          </>
        )}

        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile hamburger */}
      <MenuToggle isLoggedIn={isLoggedIn} />
    </nav>
  );
}
