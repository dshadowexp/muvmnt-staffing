"use client";

import { syncDefaultPaymentMethodAfterSetupIntent } from "@/features/payments/billing/dal/mutations";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * After Stripe redirects back from 3DS (return_url), `setup_intent` and
 * `redirect_status` are on the query string. Syncs default PM once then strips params.
 */
export function FinalizeSavedPaymentMethod() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const ran = useRef(false);

  useEffect(() => {
    const setupIntentId = searchParams.get("setup_intent");
    const redirectStatus = searchParams.get("redirect_status");
    if (!setupIntentId || redirectStatus !== "succeeded" || ran.current) return;
    ran.current = true;

    void (async () => {
      const res = await syncDefaultPaymentMethodAfterSetupIntent(setupIntentId);
      if (res.error) {
        toast.error(res.error);
        ran.current = false;
        return;
      }
      router.replace(pathname);
      router.refresh();
    })();
  }, [searchParams, router, pathname]);

  return null;
}
