"use client";

import { CircleDashedIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type LandingAuthCtasProps = {
    /** e.g. `/sign-up?as=client` or `/sign-up?as=worker` */
    signUpHref: string;
    ctaCreateLabel: string;
    ctaSignInLabel: string;
    /**
     * `onDark` — hero on charcoal (light sign-in link).
     * `onLight` — card / light section (muted sign-in link).
     */
    variant?: "onDark" | "onLight";
    className?: string;
};

export function LandingAuthCtas({
    signUpHref,
    ctaCreateLabel,
    ctaSignInLabel,
    variant = "onLight",
    className,
}: LandingAuthCtasProps) {
    const { authUser, loading } = useAuth();
    const tNav = useTranslations("nav");
    const tCommon = useTranslations("common");

    const signInClass =
        variant === "onDark"
            ? "text-sm text-white/55 no-underline transition-colors hover:text-white/80"
            : "text-muted-foreground text-sm no-underline transition-colors hover:text-foreground";

    if (loading) {
        return (
            <div
                className={cn(
                    "flex shrink-0 flex-wrap items-center gap-3",
                    className,
                )}
            >
                <CircleDashedIcon
                    className={cn(
                        "size-5 animate-spin",
                        variant === "onDark"
                            ? "text-white/45"
                            : "text-muted-foreground",
                    )}
                    aria-hidden
                />
                <span className="sr-only">{tCommon("loading")}</span>
            </div>
        );
    }

    if (authUser) {
        return (
            <div
                className={cn(
                    "flex shrink-0 flex-wrap items-center gap-3",
                    className,
                )}
            >
                <Button size="lg" asChild>
                    <Link href="/dashboard">{tNav("dashboard")}</Link>
                </Button>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "flex shrink-0 flex-wrap items-center gap-3",
                className,
            )}
        >
            <Button size="lg" asChild>
                <Link href={signUpHref}>{ctaCreateLabel}</Link>
            </Button>
            <Link href="/sign-in" className={signInClass}>
                {ctaSignInLabel}
            </Link>
        </div>
    );
}
