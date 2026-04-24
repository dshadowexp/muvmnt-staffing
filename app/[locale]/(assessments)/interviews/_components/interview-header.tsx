"use client";

import { BackLink } from "@/components/back-link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { FeedbackIcon } from "@/features/feedback/components/feedback-icon";

type InterviewHeaderProps = {
    backHref:  string;
    backTitle: string;
};

export function InterviewHeader({ backHref, backTitle }: InterviewHeaderProps) {
    return (
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur">
            <BackLink backHref={backHref} title={backTitle} />
            <div className="flex items-center gap-2">
                <FeedbackIcon />
                <LanguageSwitcher />
                <ThemeToggle />
            </div>
        </header>
    );
}
