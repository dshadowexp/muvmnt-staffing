import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Placeholder while auth session initializes — mirrors typical auth card layout
 * (overline + Card header/body at max-w-[440px]) used by operator/staff sign-in flows.
 */
export function AuthCardsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("w-full max-w-[440px]", className)}>
      <div className="mb-7 flex justify-center">
        <Skeleton className="h-3 w-32 rounded-full" aria-hidden />
      </div>

      <div
        className="overflow-hidden rounded-xl bg-card text-card-foreground shadow-xs ring-1 ring-foreground/10"
        aria-busy
        aria-label="Loading"
      >
        <div className="border-b border-border px-9 pb-6 pt-8">
          <Skeleton className="mb-2 h-8 w-[85%] max-w-sm rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="mt-2 h-4 w-4/5 rounded-md" />
        </div>

        <div className="flex flex-col gap-5 px-9 pb-8 pt-6">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-24 rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-28 rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <Skeleton className="h-11 w-full rounded-lg" />
          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-border" aria-hidden />
            <Skeleton className="h-3 w-24 rounded-full" />
            <div className="h-px flex-1 bg-border" aria-hidden />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 flex-1 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
