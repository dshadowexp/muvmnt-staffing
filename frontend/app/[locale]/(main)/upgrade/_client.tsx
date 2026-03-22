"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Tier = {
  name: string;
  price: { monthly: number; yearly: number };
  description: string;
  features: string[];
  cta: string;
  ctaVariant: "default" | "outline";
  featured: boolean;
};

export function PricingClient({
  title,
  tiers,
  defaultBilledAnnually = true,
}: {
  title: string;
  tiers: Tier[];
  defaultBilledAnnually?: boolean;
}) {
  const [billedAnnually, setBilledAnnually] = useState(defaultBilledAnnually);

  return (
    <section>
      <h2 className="mb-8 text-xl font-semibold md:text-2xl">{title}</h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tiers.map((tier) => (
          <Card
            key={tier.name}
            className={cn(
              "flex flex-col",
              tier.featured && "ring-2 ring-primary",
            )}
          >
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{tier.name}</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold">
                  ${billedAnnually ? tier.price.yearly : tier.price.monthly}
                </span>
                {tier.price.monthly > 0 && (
                  <span className="text-muted-foreground">
                    {" "}
                    per {billedAnnually ? "user/year" : "user/month"}
                  </span>
                )}
              </div>
              {tier.price.monthly > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={billedAnnually}
                    onClick={() => setBilledAnnually(!billedAnnually)}
                    className={cn(
                      "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                      billedAnnually ? "bg-primary" : "bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-1 top-1 size-4 rounded-full bg-white transition-transform",
                        billedAnnually && "translate-x-5",
                      )}
                    />
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Billed annually
                  </span>
                </div>
              )}
              <CardDescription className="mt-1">{tier.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="pt-6">
              <Button
                variant={tier.ctaVariant}
                size="lg"
                className="w-full"
                asChild
              >
                <a href={tier.cta === "Contact sales" ? "mailto:sales@muvmnt.ca" : "/sign-up"}>
                  {tier.cta}
                </a>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
