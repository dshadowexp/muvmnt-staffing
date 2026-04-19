import type { Metadata } from "next";
import "./globals.css";
import { Outfit } from "next/font/google"
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations } from "next-intl/server";
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/features/auth/providers/auth-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Analytics } from "@vercel/analytics/next"
import { CustomThemeProvider } from "@/providers/custom-theme-provider";
import { SITE_NAME } from "@/lib/constants";

const outfitSans = Outfit({
  variable: "--font-outfit-sans",
  subsets: ["latin"],
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  const tMeta = await getTranslations({ locale, namespace: "meta" });

  const title = `${t("name")} — ${t("tagline")}`;

  return {
    title: {
      default: title,
      template: `%s | ${SITE_NAME}`,
    },
    description: tMeta("description"),
    keywords: [
      "healthcare staffing",
      "temp healthcare staff",
      "home care staffing",
      "nursing staffing",
      "PSW staffing",
      "allied health staffing",
      "support staff",
      "caregiver staffing",
      "caregiver agency",
      "caregiver placement",
      "caregiver staffing",
      "caregiver agency",
      "caregiver",
    ],
    openGraph: {
      title,
      description: tMeta("openGraphDescription"),
      type: "website",
      siteName: SITE_NAME,
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: tMeta("openGraphImageAlt"),
        },
      ],
    },
    robots: {
      index: true,
      follow: false,
      nocache: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-video-preview": -1,
        "max-image-preview": "large",
      },
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export default async function RootLayout({ children, params }: { children: React.ReactNode, params: Promise<{locale: string}>; }) {
  const { locale } = await params;
  
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={ locale } suppressHydrationWarning>
      <body className={`${outfitSans.variable} antialiased font-sans`}>
        <CustomThemeProvider>
        <NextIntlClientProvider>
        <AuthProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="top-right" richColors closeButton duration={3000} />
        </AuthProvider>
        </NextIntlClientProvider>
        </CustomThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
