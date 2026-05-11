import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { CircleDashedIcon } from "lucide-react";
import { ResetPasswordForm } from "@/features/auth/forms/reset-password-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.forgot.meta" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

function ForgotPasswordFallback() {
  return (
    <div className="flex min-h-[40vh] w-full max-w-[440px] items-center justify-center">
      <CircleDashedIcon className="size-10 animate-spin text-muted-foreground" aria-hidden />
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
