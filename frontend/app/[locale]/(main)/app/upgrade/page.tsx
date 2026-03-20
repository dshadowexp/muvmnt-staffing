import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { PricingClient } from "./_client";
import type { UserRole } from "@/types/auth";

export const metadata = {
  title: "Pricing | Muvmnt",
  description: "Flexible pricing for workers and clients. Choose the plan that fits your needs.",
};

export default async function PricingPage() {
  const { user } = await getCurrentUser({ allData: true });
  const role = user?.role as UserRole;

  return (
    <div className="container max-w-6xl py-12 md:py-16">
      <div className="mb-12 text-center">
        <h1 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
          Pricing
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Use for free with your whole team. Upgrade to enable unlimited shifts,
          enhanced security controls, and additional features.
        </p>
      </div>

      {role === "client" && (
        <PricingClient
          title="Plans for staffing teams"
          tiers={CLIENT_TIERS}
          defaultBilledAnnually
        />
      )}

      {role === "worker" && (
        <PricingClient
          title="Plans for healthcare workers"
          tiers={WORKER_TIERS}
          defaultBilledAnnually
        />
      )}
    </div>
  );
}

const WORKER_TIERS = [
  {
    name: "Basic",
    price: { monthly: 0, yearly: 0 },
    description: "Free for everyone",
    features: [
      "Unlimited job applications",
      "Profile visibility",
      "Basic shift notifications",
      "Up to 5 saved jobs",
    ],
    cta: "Get started",
    ctaVariant: "outline" as const,
    featured: false,
  },
  {
    name: "Premium",
    price: { monthly: 9, yearly: 6 },
    description: "For serious job seekers",
    features: [
      "All Basic features and...",
      "Priority job matching",
      "Unlimited saved jobs",
      "Resume optimization tips",
      "Interview prep resources",
      "Early access to new shifts",
    ],
    cta: "Get started",
    ctaVariant: "default" as const,
    featured: true,
  },
  {
    name: "Pro",
    price: { monthly: 24, yearly: 20 },
    description: "Maximize your opportunities",
    features: [
      "All Premium features and...",
      "1-on-1 career coaching",
      "Certification tracking",
      "Dedicated support",
      "Custom availability preferences",
    ],
    cta: "Contact sales",
    ctaVariant: "outline" as const,
    featured: false,
  },
];

const CLIENT_TIERS = [
  {
    name: "Basic",
    price: { monthly: 0, yearly: 0 },
    description: "Get started at no cost",
    features: [
      "Up to 3 active job postings",
      "Basic candidate search",
      "Email notifications",
      "Standard support",
    ],
    cta: "Get started",
    ctaVariant: "outline" as const,
    featured: false,
  },
  {
    name: "Premium",
    price: { monthly: 49, yearly: 39 },
    description: "Scale your staffing",
    features: [
      "All Basic features and...",
      "Unlimited job postings",
      "AI-powered candidate matching",
      "Interview scheduling",
      "Advanced analytics",
      "Priority support",
    ],
    cta: "Get started",
    ctaVariant: "default" as const,
    featured: true,
  },
  {
    name: "Pro",
    price: { monthly: 149, yearly: 119 },
    description: "Enterprise-grade staffing",
    features: [
      "All Premium features and...",
      "Dedicated account manager",
      "Custom integrations",
      "SSO & advanced security",
      "Compliance reporting",
      "24/7 phone support",
    ],
    cta: "Contact sales",
    ctaVariant: "outline" as const,
    featured: false,
  },
];
