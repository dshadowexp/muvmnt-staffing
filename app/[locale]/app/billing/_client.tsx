"use client";

import { useFormStatus } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import {
  CircleDashedIcon,
  CreditCardIcon,
  CalendarIcon,
  UsersIcon,
  ClipboardListIcon,
  VideoIcon,
  FileTextIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { setupBillingPortalAction } from "@/features/billing/actions";
import { BillingPricingDrawer } from "@/features/billing/components/billing-pricing-drawer";
import type { SubscriptionRow } from "@/features/billing/dal/subscriptions";
import type {
  DefaultCardSummary,
  StripeInvoiceSummary,
} from "@/features/billing/dal/payment-methods";

function ManageBillingButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? (
        <CircleDashedIcon className="size-4 animate-spin" aria-hidden />
      ) : (
        <CreditCardIcon className="size-4" aria-hidden />
      )}
      {pending ? pendingLabel : label}
    </Button>
  );
}

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

function LimitRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  const display =
    value === -1 || value >= 9999 ? "Unlimited" : value.toLocaleString();
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">{display}</span>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatInvoiceStatus(status: string | null): string {
  if (!status) return "—";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function BillingPanel({
  facilityName,
  subscription,
  invoices,
  defaultCard,
}: {
  facilityName: string | null;
  subscription: SubscriptionRow | null;
  invoices: StripeInvoiceSummary[];
  defaultCard: DefaultCardSummary | null;
}) {
  const t = useTranslations("dashboard.client.billing");
  const locale = useLocale();

  const formatMoney = (cents: number, currency: string) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);

  return (
    <div className="flex flex-col gap-4">
      {subscription ? (
        <Card size="sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="py-1">{capitalize(subscription.plan)} plan</CardTitle>
                <CardDescription>{t("portalCardDescription")}</CardDescription>
              </div>
              <StatusBadge status={subscription.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex-1 text-sm text-muted-foreground">Subscription</span>
              <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-sm text-muted-foreground">{t("currentPeriod")}</span>
              <span className="text-sm font-medium">
                {formatDate(subscription.current_period_start)} –{" "}
                {formatDate(subscription.current_period_end)}
              </span>
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("planLimits")}
              </p>
              <LimitRow icon={UsersIcon} label={t("teamSeats")} value={subscription.seats_limit ?? 0} />
              <LimitRow
                icon={ClipboardListIcon}
                label={t("screeningsCap")}
                value={subscription.screenings_limit ?? 0}
              />
              <LimitRow
                icon={VideoIcon}
                label={t("screeningInvitesCap")}
                value={subscription.screening_invites_limit ?? 0}
              />
            </div>

            <Separator />

            <form action={setupBillingPortalAction} className="flex justify-end">
              <ManageBillingButton label={t("manageBilling")} pendingLabel={t("manageBillingPending")} />
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card size="sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex flex-wrap items-center gap-2 py-1">
                  <span className="flex-1 text-sm text-muted-foreground">Subscription Plan</span>
                  {t("freePlanTitle")}
                  <Badge variant="secondary" className="text-xs font-medium">
                    {t("freePlanBadge")}
                  </Badge>
                </CardTitle>
                <CardDescription>{t("freePlanDescription")}</CardDescription>
              </div>
              <div>
                <BillingPricingDrawer
                  facilityName={facilityName}
                  currentPlan={null}
                  trigger={
                    <Button type="button" variant="outline" className="w-full sm:w-auto">
                      {t("viewPlans")}
                    </Button>
                  }
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Separator />
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("planLimits")}
              </p>
              <LimitRow icon={UsersIcon} label={t("teamSeats")} value={1} />
              <LimitRow icon={ClipboardListIcon} label={t("screeningsCap")} value={1} />
              <LimitRow icon={VideoIcon} label={t("screeningInvitesCap")} value={1} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card size="sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCardIcon className="size-4 text-muted-foreground" aria-hidden />
                {t("paymentMethodTitle")}
              </CardTitle>
              <CardDescription>{t("cardsDescription")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {defaultCard ? (
            <p className="text-sm font-medium">
              {t("paymentMethodCard", {
                brand: capitalize(defaultCard.brand),
                last4: defaultCard.last4,
                month: String(defaultCard.expMonth).padStart(2, "0"),
                year: String(defaultCard.expYear),
              })}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">{t("paymentMethodNone")}</p>
          )}
          <form action={setupBillingPortalAction} className="flex justify-end">
            <ManageBillingButton label={t("manageBilling")} pendingLabel={t("manageBillingPending")} />
          </form>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileTextIcon className="size-4 text-muted-foreground" aria-hidden />
            {t("invoicesTitle")}
          </CardTitle>
          <CardDescription>{t("invoicesSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("invoicesEmpty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("invoiceColDate")}</TableHead>
                  <TableHead>{t("invoiceColNumber")}</TableHead>
                  <TableHead className="text-right">{t("invoiceColAmount")}</TableHead>
                  <TableHead>{t("invoiceColStatus")}</TableHead>
                  <TableHead className="text-right w-[100px]"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(inv.created * 1000).toLocaleDateString(locale, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="font-medium tabular-nums">
                      {inv.number ?? inv.id.slice(0, 12) + "…"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(inv.total, inv.currency)}
                    </TableCell>
                    <TableCell>{formatInvoiceStatus(inv.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {inv.hostedInvoiceUrl ? (
                          <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                            <a href={inv.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">
                              {t("invoiceView")}
                              <ExternalLinkIcon className="ml-1 size-3" aria-hidden />
                            </a>
                          </Button>
                        ) : null}
                        {inv.invoicePdf ? (
                          <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                            <a href={inv.invoicePdf} target="_blank" rel="noopener noreferrer">
                              {t("invoicePdf")}
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
