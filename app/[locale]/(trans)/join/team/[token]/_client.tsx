"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthRedirect } from "@/features/auth/hooks/use-auth-redirect";

type Preview =
  | { ok: true; email: string; facilityName: string; expiresAt: string }
  | { ok: false; reason: "invalid" | "expired" | "used" };

export function JoinTeamClient({
  token,
  preview,
}: {
  token: string;
  preview: Preview;
}) {
  const t = useTranslations("auth.joinTeam");
  const { withAuthParams } = useAuthRedirect();

  if (!preview.ok) {
    const title =
      preview.reason === "expired"
        ? t("expiredTitle")
        : preview.reason === "used"
          ? t("usedTitle")
          : t("invalidTitle");
    const body =
      preview.reason === "used"
        ? t("usedBody")
        : preview.reason === "expired"
          ? t("invalidBody")
          : t("invalidBody");

    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{body}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button asChild variant="outline">
            <Link href={withAuthParams("/sign-in/facility")}>{t("ctaSignIn")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const signUpHref = withAuthParams(`/sign-up/client?invite_token=${encodeURIComponent(token)}`);
  const signInHref = withAuthParams(`/sign-in/facility?invite_token=${encodeURIComponent(token)}`);

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("subtitle", { facilityName: preview.facilityName })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("inviteEmailNote", { email: preview.email })}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button asChild className="sm:flex-1">
            <Link href={signUpHref}>{t("ctaSignUp")}</Link>
          </Button>
          <Button asChild variant="outline" className="sm:flex-1">
            <Link href={signInHref}>{t("ctaSignIn")}</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("signInHint")}</p>
      </CardContent>
    </Card>
  );
}
