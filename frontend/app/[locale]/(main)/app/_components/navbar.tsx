import LogoutButton from "@/features/auth/components/logout-button";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/features/users/components/user-avatar";
import { LogOut, User, Wallet } from "lucide-react";
import { UserRole } from "@/types/auth";

export function Navbar({ user }: { user: { name: string; imageUrl: string, role: UserRole } }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-header border-b bg-background">
      <div className="container flex h-full items-center justify-between">
        <Logo href="/app" />

        <div className="flex items-center gap-4">
          {/* {typeof jobInfoId === "string" &&
            navLinks.map(({ name, href, Icon }) => {
              const hrefPath = `/app/job-infos/${jobInfoId}/${href}`

              return (
                <Button
                  variant={pathName === hrefPath ? "secondary" : "ghost"}
                  key={name}
                  asChild
                  className="cursor-pointer max-sm:hidden"
                >
                  <Link href={hrefPath}>
                    <Icon />
                    {name}
                  </Link>
                </Button>
              )
            })} */}
          <LanguageSwitcher />
          <ThemeToggle />
          
          <DropdownMenu>
            <DropdownMenuTrigger>
              <UserAvatar user={user} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>
                <User className="mr-2" />
                Profile
              </DropdownMenuItem>
              {user.role === "worker" && (
                <DropdownMenuItem>
                  <Wallet className="mr-2" />
                  Payroll
                </DropdownMenuItem>
              )}
              <LogoutButton asChild>
                <DropdownMenuItem>
                  <LogOut className="mr-2" />
                  Logout
                </DropdownMenuItem>
              </LogoutButton>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}