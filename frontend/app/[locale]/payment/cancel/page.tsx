import Link from "next/link";
import { XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PaymentCancelPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <Card className="w-full max-w-[400px] overflow-hidden rounded-2xl shadow-lg">
        <CardContent className="flex flex-col items-center gap-6 px-9 py-12 text-center">
          <div className="rounded-full bg-muted p-4">
            <XCircle className="size-12 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="font-[var(--font-display)] text-xl font-bold tracking-tight text-foreground">
              Payment cancelled
            </h1>
            <p className="text-sm font-light text-muted-foreground">
              No charge was made. You can try again whenever you&apos;re ready.
            </p>
          </div>
          <Button asChild size="lg" variant="outline" className="w-full">
            <Link href="/upgrade">Back to pricing</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
