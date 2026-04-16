"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  ChevronDownIcon,
  CopyIcon,
  DollarSignIcon,
  ExternalLinkIcon,
  GiftIcon,
  HelpCircleIcon,
  MousePointer2Icon,
  SettingsIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import * as React from "react";
import { toast } from "sonner";

const DEMO_REFERRAL_URL = `https://refer.muvmnt.ca/sign-up?ref=demo`;

function HubCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-800/80 bg-zinc-950/90 p-5 shadow-sm md:p-6",
        className,
      )}
      {...props}
    />
  );
}

export function ReferEarnDashboard() {
  const [copied, setCopied] = React.useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(DEMO_REFERRAL_URL);
      setCopied(true);
      toast.success("Link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-zinc-800 bg-black text-zinc-50",
        "bg-[linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)]",
        "bg-[size:32px_32px]",
      )}
    >
      <div className="relative z-[1] p-5 md:p-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-lg font-semibold tracking-tight md:text-xl">
            Refer and earn
          </h1>
          <p className="text-muted-foreground mt-1 max-w-xl text-sm text-zinc-400">
            Share your link and earn rewards when people join through you.
          </p>
        </div>

        <HubCard className="mb-4 md:mb-6">
          <div className="grid gap-8 lg:grid-cols-[1fr_minmax(200px,280px)] lg:items-stretch">
            <div className="flex min-w-0 flex-col gap-8">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-white">Referral link</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  <div className="relative min-w-0 flex-1">
                    <Input
                      readOnly
                      value={DEMO_REFERRAL_URL}
                      className="h-11 rounded-xl border-zinc-700 bg-zinc-900/80 pr-10 font-mono text-xs text-zinc-100 md:text-sm"
                    />
                    <ChevronDownIcon className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-zinc-500" />
                  </div>
                  <Button
                    type="button"
                    onClick={copyLink}
                    className="h-11 shrink-0 rounded-xl bg-white px-5 font-medium text-zinc-950 hover:bg-zinc-200"
                  >
                    <CopyIcon className="size-4" />
                    {copied ? "Copied" : "Copy link"}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">Rewards</p>
                  <Link
                    href="/terms"
                    className="text-muted-foreground inline-flex items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-white"
                  >
                    View terms
                    <ExternalLinkIcon className="size-3.5" />
                  </Link>
                </div>
                <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <div className="flex gap-3 text-sm">
                    <DollarSignIcon className="mt-0.5 size-4 shrink-0 text-zinc-400" />
                    <span className="text-zinc-200">
                      20% per sale for <strong className="text-white">1 year</strong>
                    </span>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <GiftIcon className="mt-0.5 size-4 shrink-0 text-zinc-400" />
                    <span className="text-zinc-200">
                      New users get 20% off for 12 months
                    </span>
                  </div>
                  <p className="border-t border-zinc-800/80 pt-3 text-xs leading-relaxed text-zinc-500">
                    $10 minimum payout amount · 30-day holding period
                  </p>
                </div>
              </div>
            </div>

            <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl lg:min-h-0">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-[12%] top-[18%] size-16 rounded-lg bg-white/10 blur-md" />
                <div className="absolute right-[20%] top-[30%] size-10 rounded-md bg-white/5 blur-sm" />
                <div className="absolute bottom-[22%] left-[28%] size-12 rounded-lg bg-white/[0.08] blur-md" />
              </div>
              <div className="relative flex size-28 items-center justify-center rounded-full bg-white shadow-lg ring-4 ring-white/10">
                <span className="text-center text-sm font-bold tracking-tight text-zinc-900">
                  {SITE_NAME}
                </span>
              </div>
              <p className="text-muted-foreground absolute bottom-3 right-3 text-[10px] text-zinc-500">
                Powered by <span className="text-zinc-400">{SITE_NAME}</span>
              </p>
            </div>
          </div>
        </HubCard>

        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <HubCard className="relative min-h-[200px] overflow-hidden">
            <svg
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full text-zinc-800/60"
              preserveAspectRatio="none"
              viewBox="0 0 400 80"
              aria-hidden
            >
              <path
                d="M0,60 C80,55 120,20 200,35 S320,10 400,25 L400,80 L0,80 Z"
                fill="currentColor"
                opacity="0.35"
              />
              <path
                d="M0,60 C80,55 120,20 200,35 S320,10 400,25"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-zinc-600"
              />
            </svg>
            <div className="relative flex h-full min-h-[180px] flex-col items-center justify-center gap-2 py-8 text-center">
              <MousePointer2Icon className="size-5 text-zinc-500" />
              <p className="text-sm font-medium text-zinc-200">No activity yet</p>
              <p className="max-w-xs text-xs text-zinc-500">
                After your first click, your stats will show
              </p>
            </div>
          </HubCard>

          <HubCard className="flex flex-col">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-white">Earnings</p>
                <button
                  type="button"
                  className="text-zinc-500 transition-colors hover:text-zinc-300"
                  aria-label="Earnings info"
                >
                  <HelpCircleIcon className="size-4" />
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-lg border-zinc-600 bg-transparent text-xs text-white hover:bg-zinc-800"
              >
                <SettingsIcon className="size-3.5" />
                Settings
              </Button>
            </div>
            <div className="mt-auto space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-400">Upcoming</span>
                <span className="font-medium tabular-nums text-white">$0.00</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-400">Paid</span>
                <span className="font-medium tabular-nums text-white">$0.00</span>
              </div>
            </div>
          </HubCard>
        </div>
      </div>
    </div>
  );
}
