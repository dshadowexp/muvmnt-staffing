"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { CircleDashedIcon } from "lucide-react";
import {
  clearLinkedInHandoffCookie,
  peekLinkedInFirebaseToken,
} from "./_actions";
import { runLinkedInHandoffOnce } from "./linkedin-handoff-flight";
import { signInWithCustomToken } from "@/services/firebase/auth";
import { useAuth } from "@/features/auth/providers/auth-provider";

export default function LinkedInRedirectPage() {
  const router = useRouter();
  const { setPendingRole } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void runLinkedInHandoffOnce(async () => {
      let intendedRole: string | null = null;
      try {
        intendedRole = window.localStorage.getItem("rk_oauth_intended_role");
        window.localStorage.removeItem("rk_oauth_intended_role");
      } catch {
        intendedRole = null;
      }

      const handoff = await peekLinkedInFirebaseToken();
      if (!handoff.ok) {
        setError("missing_token");
        return;
      }

      try {
        // Default to worker for the LinkedIn flow; allow the pre-redirect value to override.
        setPendingRole(intendedRole === "client" ? "client" : "worker");
        await signInWithCustomToken(handoff.token);
        await clearLinkedInHandoffCookie();
      } catch {
        await clearLinkedInHandoffCookie().catch(() => {});
        setPendingRole(null);
        setError("sign_in_failed");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    });
  }, [router, setPendingRole]);

  if (error === "missing_token") {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-lg font-semibold">Could not complete sign-in</h1>
        <p className="text-muted-foreground text-sm max-w-md">
          The LinkedIn handoff is missing or expired. Try LinkedIn again from the
          worker sign-in page.
        </p>
        <Link
          href="/sign-in/worker"
          className="text-primary text-sm font-medium underline underline-offset-4"
        >
          Back to worker sign in
        </Link>
      </div>
    );
  }

  if (error === "sign_in_failed") {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-lg font-semibold">Sign-in failed</h1>
        <p className="text-muted-foreground text-sm max-w-md">
          Something went wrong finishing sign-in. Try again from the worker
          sign-in page.
        </p>
        <Link
          href="/sign-in/worker"
          className="text-primary text-sm font-medium underline underline-offset-4"
        >
          Back to worker sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6">
      <CircleDashedIcon className="size-10 animate-spin text-muted-foreground" />
      <p className="text-muted-foreground text-sm">Completing sign-in…</p>
    </div>
  );
}