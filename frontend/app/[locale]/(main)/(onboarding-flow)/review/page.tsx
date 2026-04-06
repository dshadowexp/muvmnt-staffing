import { ClipboardCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function WorkerOnboardingReviewPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 px-4 py-5 sm:flex-row sm:items-start">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ClipboardCheck className="size-6" strokeWidth={2} />
        </div>
        <div className="min-w-0 space-y-2 text-sm">
          <p className="font-medium text-foreground">Profile under review</p>
          <p className="text-muted-foreground">
            Thank you for finishing every step. Your application is now with our team for
            verification. You&apos;ll hear from us by email or phone once we&apos;ve finished
            reviewing your profile.  Most reviews are completed within{" "}
            <span className="font-medium text-foreground">24 hours</span>, though it can
            occasionally take a little longer during busy periods.
          </p>
        </div>
      </div>
      <Alert>
        <AlertTitle>What you can do now</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          No further action is needed on this page. Check your inbox and messages for updates
          from Muvmnt—we&apos;ll let you know as soon as your account is ready.
        </AlertDescription>
      </Alert>
    </div>
  );
}
