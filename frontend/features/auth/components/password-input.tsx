"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  FieldDescription,
  FieldError,
} from "@/components/ui/field";

const STRENGTH_KEYS = ["weak", "fair", "good", "strong"] as const;
const STRENGTH_STYLES = [
  { color: "bg-red-500", text: "text-red-500" },
  { color: "bg-orange-500", text: "text-orange-500" },
  { color: "bg-yellow-500", text: "text-yellow-500" },
  { color: "bg-green-500", text: "text-green-500" },
];

function PasswordStrength({ password }: { password: string }) {
  const t = useTranslations("auth.password.strength");
  if (!password) return null;

  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const index = Math.max(0, Math.min(score - 1, 3));
  const style = STRENGTH_STYLES[index];

  return (
    <div className="mt-1 flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {STRENGTH_STYLES.map((s, i) => (
          <div
            key={i}
            className={cn(
              "h-[3px] flex-1 rounded-sm transition-colors duration-300",
              i < score ? style.color : "bg-border",
            )}
          />
        ))}
      </div>
      <span className={cn("min-w-10 text-[0.7rem] font-semibold", style.text)}>
        {t(STRENGTH_KEYS[index])}
      </span>
    </div>
  );
}

export type PasswordProps = Omit<
  React.ComponentProps<typeof Input>,
  "type"
> & {
  password?: string;
  error?: string;
  showStrength?: boolean;
};

export const Password = forwardRef<HTMLInputElement, PasswordProps>(
  function PasswordInput(
    { password, error, showStrength, className, ...props },
    ref,
  ) {
    const [showPass, setShowPass] = useState(false);
    const t = useTranslations("auth.password");

    return (
      <>
        <div className="relative">
          <Input
            ref={ref}
            type={showPass ? "text" : "password"}
            className={cn("pr-11", className)}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPass((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            tabIndex={-1}
            aria-label={showPass ? t("hide") : t("show")}
          >
            {showPass ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        {showStrength && password !== undefined && (
          <PasswordStrength password={password} />
        )}
        {error ? (
          <FieldError>{error}</FieldError>
        ) : showStrength ? (
          <FieldDescription>{t("minHint")}</FieldDescription>
        ) : null}
      </>
    );
  },
);
