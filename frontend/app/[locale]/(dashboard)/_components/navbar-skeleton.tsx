import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";

export function NavbarSkeleton() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-header border-b bg-background">
      <div className="container flex h-full items-center justify-between">
        <Logo href="/app" />

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <ThemeToggle />
          <Skeleton className="size-8 shrink-0 rounded-full" />
        </div>
      </div>
    </nav>
  );
}
