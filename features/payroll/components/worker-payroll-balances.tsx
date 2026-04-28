"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  loadConnectAndInitialize,
  type StripeConnectInstance,
} from "@stripe/connect-js";
import {
  ConnectBalances,
  ConnectComponentsProvider,
} from "@stripe/react-connect-js";
import { CircleDashedIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createPayrollBalancesAccountSession } from "../dal/mutations";
import { env } from "@/data/env/client";

export function WorkerPayrollBalances() {
  const [connectInstance, setConnectInstance] = useState<StripeConnectInstance | null>(null);

  useEffect(() => {
    const publishableKey = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) return;

    const instance = loadConnectAndInitialize({
      publishableKey,
      fetchClientSecret: async () => {
        const res = await createPayrollBalancesAccountSession();
        if (!res.ok) {
          throw new Error(res.message);
        }
        return res.clientSecret;
      },
    });
    setConnectInstance(instance);
  }, []);

  if (!env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return (
      <p className="text-muted-foreground text-sm">
        Stripe is not configured (missing publishable key).
      </p>
    );
  }

  if (!connectInstance) {
    return (
      <Card size="sm">
        <CardContent className="flex min-h-[200px] items-center justify-center gap-2 py-8">
          <CircleDashedIcon className="text-muted-foreground size-6 animate-spin" />
          <span className="text-muted-foreground text-sm">
            Loading payroll…
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Balance & payouts</CardTitle>
        <CardDescription>
          Your connected account balance, upcoming payouts, and payout settings
          (powered by Stripe).
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-[240px]">
        <ConnectComponentsProvider connectInstance={connectInstance}>
          <ConnectBalances
            onLoadError={({ error }) => {
              toast.error(
                error?.message ?? "Could not load payroll balance from Stripe.",
              );
            }}
          />
        </ConnectComponentsProvider>
      </CardContent>
    </Card>
  );
}
