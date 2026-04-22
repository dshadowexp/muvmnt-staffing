"use client";

import { Slot } from "@radix-ui/react-slot";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { getAuthErrorKey, logout } from "@/services/firebase/auth";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { useRouter } from "@/i18n/navigation";
import posthog from "posthog-js";

interface LogoutButtonProps {
  asChild?: boolean;
  children?: React.ReactNode;
}

export function LogoutButton({ asChild = false, children }: LogoutButtonProps) {
  const { loading } = useAuth();
  const router = useRouter();
  const tErrors = useTranslations("auth.errors");

  const handleLogout = async () => {
    if (loading) return;
    try {
      posthog.capture("user_logged_out");
      posthog.reset();
      await logout();
      router.push("/sign-in");
    } catch (err) {
      const key = getAuthErrorKey(err);
      if (key) toast.error(tErrors(key));
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
