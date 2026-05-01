"use client";

import { useAuth } from "@/features/auth/providers/auth-provider";
import { AuthCardsSkeleton } from "@/features/auth/components/auth-cards-skeleton";

export function AuthRedirectGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex w-full flex-col items-center">
        <AuthCardsSkeleton />
      </div>
    );
  }

  return <>{children}</>;
}