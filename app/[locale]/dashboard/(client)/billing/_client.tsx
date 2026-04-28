"use client";

import { useFormStatus } from "react-dom";
import { CircleDashedIcon, CreditCardIcon, CalendarIcon, UsersIcon, ClipboardListIcon, VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { setupBillingPortalAction } from "@/features/billing/actions";
import type { SubscriptionRow } from "@/features/billing/dal/subscriptions";

// ─── Manage Billing Button ────────────────────────────────────────────────────

function ManageBillingButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? (
        <CircleDashedIcon className="size-4 animate-spin" aria-hidden />
      ) : (
        <CreditCardIcon className="size-4" aria-hidden />
      )}
      {pending ? "Redirecting…" : "Manage billing"}
    </Button>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800",
    trialing: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    past_due: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    canceled: "bg-muted text-muted-foreground border-border",
    unpaid: "bg-destructive/10 text-destructive border-destructive/20",
  };
  const label = status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ");
  return (
    <Badge variant="outline" className={`text-xs font-medium ${styles[status] ?? styles.canceled}`}>
      {label}
    </Badge>
  );
}

// ─── Limit Row ────────────────────────────────────────────────────────────────

function LimitRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">
        {value === -1 ? "Unlimited" : value.toLocaleString()}
      </span>
    </div>
  );
}

// ─── Format dates ─────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Billing Panel ────────────────────────────────────────────────────────────

export function BillingPanel({ subscription }: { subscription: SubscriptionRow | null }) {
  if (!subscription) {
    return (
      <Card size="sm">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            You don&apos;t have an active subscription yet.
          </p>
          <Button variant="outline" asChild>
            <a href="/pricing">View plans</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Plan overview */}
      <Card size="sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="py-1">{capitalize(subscription.plan)} plan</CardTitle>
              <CardDescription>Your current subscription</CardDescription>
            </div>
            <StatusBadge status={subscription.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Billing period */}
          <div className="flex items-center gap-3">
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-sm text-muted-foreground">Current period</span>
            <span className="text-sm font-medium">
              {formatDate(subscription.current_period_start)} – {formatDate(subscription.current_period_end)}
            </span>
          </div>

          <Separator />

          {/* Usage limits */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Plan limits
            </p>
            <LimitRow icon={UsersIcon} label="Team seats" value={subscription.seats_limit} />
            <LimitRow icon={ClipboardListIcon} label="Screenings" value={subscription.screenings_limit} />
            <LimitRow icon={VideoIcon} label="Interviews" value={subscription.interviews_limit} />
          </div>

          <Separator />

          {/* Portal CTA */}
          <form action={setupBillingPortalAction} className="flex justify-end">
            <ManageBillingButton />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
