"use client";

import { LogoutButton } from "@/features/auth/components/logout-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/features/users/components/user-avatar";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { CalendarClock, Check, LogOut, User, Wallet } from "lucide-react";

function appCurrentPageLabel(pathname: string, isClient: boolean): string {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === "/app") return "Home";
  if (path.startsWith("/app/profile")) {
    return isClient ? "Account" : "Profile";
  }
  if (path.startsWith("/app/availability")) return "Availability";
  if (path.startsWith("/app/payroll")) return "Payroll";
  if (path.startsWith("/app/shifts")) return "Shifts";
  if (path.startsWith("/app/interviews")) return "Interviews";
  if (path.startsWith("/app/referrals")) return "Referrals";
  if (path.startsWith("/app/billing")) return "Billing";
  return "App";
}

export function NavbarUserMenu({
  displayName,
  imageUrl,
  role,
}: {
  displayName: string;
  imageUrl: string;
  role: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isWorker = role?.toLowerCase() === "worker";
  const isClient = role?.toLowerCase() === "client";

  const currentLabel = appCurrentPageLabel(pathname, isClient);
  const onProfile = pathname.startsWith(`/${role}/profile`);
  const onAvailability = pathname.startsWith(`/${role}/availability`);
  const onPayroll = pathname.startsWith(`/${role}/payroll`);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <UserAvatar user={{ name: displayName, imageUrl }} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="space-y-0.5 pb-2 font-normal">
          <span className="text-muted-foreground text-xs">Current page</span>
          <span className="text-foreground block text-sm font-medium">
            {currentLabel}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          aria-current={onProfile ? "page" : undefined}
          className={cn(onProfile && "bg-accent/50")}
          onSelect={() => {
            router.push(`/${role}/profile`);
          }}
        >
          <User className="mr-2" />
          <span className="flex-1">{isClient ? "Account" : "Profile"}</span>
          {onProfile ? <Check className="text-muted-foreground ml-auto size-4" /> : null}
        </DropdownMenuItem>
        {isWorker ? (
          <>
            <DropdownMenuItem
              aria-current={onAvailability ? "page" : undefined}
              className={cn(onAvailability && "bg-accent/50")}
              onSelect={() => {
                router.push(`/${role}/availability`);
              }}
            >
              <CalendarClock className="mr-2" />
              <span className="flex-1">Availability</span>
              {onAvailability ? (
                <Check className="text-muted-foreground ml-auto size-4" />
              ) : null}
            </DropdownMenuItem>
            <DropdownMenuItem
              aria-current={onPayroll ? "page" : undefined}
              className={cn(onPayroll && "bg-accent/50")}
              onSelect={() => {
                router.push(`/${role}/payroll`);
              }}
            >
              <Wallet className="mr-2" />
              <span className="flex-1">Payroll</span>
              {onPayroll ? <Check className="text-muted-foreground ml-auto size-4" /> : null}
            </DropdownMenuItem>
          </>
        ) : null}
        <LogoutButton asChild>
          <DropdownMenuItem>
            <LogOut className="mr-2" />
            Logout
          </DropdownMenuItem>
        </LogoutButton>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
