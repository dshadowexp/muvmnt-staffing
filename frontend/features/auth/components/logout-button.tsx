"use client";

import { Slot } from "@radix-ui/react-slot";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { getAuthErrorMessage, logout } from "@/services/firebase/auth";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { useRouter } from "@/i18n/navigation";

interface LogoutButtonProps {
  asChild?: boolean;
  children?: React.ReactNode;
}

export function LogoutButton({ asChild = false, children }: LogoutButtonProps) {
  const { loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    if (loading) return;
    try {
      await logout();
      router.push("/sign-in");
    } catch (err) {
      const msg = getAuthErrorMessage(err);
      if (msg) toast.error(msg);
    }
  };

  const sharedProps = {
    onClick: handleLogout,
    disabled: loading,
  };
  if (asChild && children) {
    return (
      <Slot {...sharedProps}>
        {children}
      </Slot>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLogout}
      disabled={loading}
      className="mt-1.5 shrink-0 gap-1.5 text-muted-foreground hover:border-destructive/40 hover:text-destructive"
    >
      <LoadingSwap isLoading={loading} className="inline-flex items-center gap-2">  
        <LogOut className="size-3.5" />
        Logout
      </LoadingSwap>
    </Button>
  );
}
