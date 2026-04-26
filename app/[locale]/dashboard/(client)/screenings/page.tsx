import { Suspense } from "react";
import { PlusIcon, ClipboardListIcon, ArrowRightIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getClientProfile } from "@/features/profile/dal/queries";
import { getScreeningsForClient } from "@/features/screenings/dal/queries";

export default async function ScreeningsPage() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          Screenings
        </h1>
        <Link
          href="/dashboard/screenings/new"
          className="text-muted-foreground hover:text-foreground inline-flex w-fit shrink-0 items-center gap-2 rounded-lg border border-dashed border-border bg-muted/15 px-3 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-muted/30"
        >
          <PlusIcon className="size-4 shrink-0" aria-hidden />
          New Screening
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4">
            {[0, 1, 2].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-48" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        }
      >
        <ScreeningsList />
      </Suspense>
    </div>
  );
}

async function ScreeningsList() {
  const client = await getClientProfile();
  if (!client) return <p className="text-muted-foreground text-sm">Client profile not found.</p>;

  const screenings = await getScreeningsForClient(client.id);

  if (screenings.length === 0) {
    return (
      <Link href="/dashboard/screenings/new">
        <Card className="flex min-h-[8.5rem] items-center justify-center border-dashed border-3 bg-transparent shadow-none transition-colors hover:border-primary/50">
          <div className="text-lg flex items-center gap-2 text-muted-foreground">
            <PlusIcon className="size-6 shrink-0" aria-hidden />
            Create your first screening
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 has-hover:*:not-hover:opacity-70">
      {screenings.map((s) => (
        <Link
          key={s.id}
          href={`/dashboard/screenings/${s.id}`}
          className="hover:scale-[1.02] transition-[transform_opacity]"
        >
          <Card className="h-full">
            <div className="flex h-full items-center justify-between">
              <div className="space-y-4 h-full">
                <CardHeader>
                  <CardTitle className="text-lg">{s.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground line-clamp-3">
                  {s.description}
                </CardContent>
                <CardFooter>
                  <StatusBadge status={s.status} />
                </CardFooter>
              </div>
              <CardContent>
                <ArrowRightIcon className="size-6" />

              </CardContent>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
        Active
      </Badge>
    );
  }
  if (status === "paused") {
    return (
      <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
        Paused
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Closed
    </Badge>
  );
}
