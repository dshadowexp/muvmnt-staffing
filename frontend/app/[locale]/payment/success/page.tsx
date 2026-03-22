import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PaymentSuccessPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <Card className="w-full max-w-[400px] overflow-hidden rounded-2xl shadow-lg">
        <CardContent className="flex flex-col items-center gap-6 px-9 py-12 text-center">
          <div className="rounded-full bg-primary/10 p-4">
            <CheckCircle className="size-12 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="font-[var(--font-display)] text-xl font-bold tracking-tight text-foreground">
              Payment successful
            </h1>
            <p className="text-sm font-light text-muted-foreground">
              Thank you for your purchase. Your subscription is now active.
            </p>
          </div>
          <Button asChild size="lg" className="w-full">
            <Link href="/app">Go to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
