import type { Metadata } from "next";
import "./globals.css";
import { Outfit } from "next/font/google"
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/features/auth/auth-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Analytics } from "@vercel/analytics/next"

const outfitSans = Outfit({
  variable: "--font-outfit-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Muvmnt connects Canadian healthcare facilities with pre-screened, credentialed professionals — fast. Temporary staffing, home care, and emergency relief across Canada.",
  keywords: [
    "healthcare staffing Canada",
    "nursing agency Ontario",
    "PSW placement",
    "temp healthcare staff",
    "RN RPN staffing agency",
    "home care staffing",
  ],
  openGraph: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: "Fast, reliable healthcare staffing solutions for Canadian facilities.",
    type: "website",
    siteName: SITE_NAME,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Muvmnt Staffing Inc.",
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
      'max-snippet': -1,
      'max-video-preview': -1,
      'max-image-preview': 'large',
    },
  },
};

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
        <NextIntlClientProvider>
        <AuthProvider>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableColorScheme
            disableTransitionOnChange
          >
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster position="top-right" richColors closeButton duration={3000} />
        </ThemeProvider>
        </AuthProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
