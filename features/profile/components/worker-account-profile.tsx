"use client";

import { Suspense, use, useState } from "react";
import { Pencil } from "lucide-react";
import { format } from "date-fns";
import { WorkerAuthorizationForm } from "@/features/profile/components/worker-authorization-form";
import { ProfessionExperienceCard } from "@/features/profile/components/profession-experience-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type WorkerRow = {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  profession: string;
  years_exp: number;
};

type WorkAuthData = {
  type: string;
  file_url?: string | null;
  social_number?: string | null;
  social_number_expiry?: string | null;
  is_verified: boolean;
} | null;

export function WorkerAccountProfile({
  worker,
  workAuthPromise,
}: {
  worker: WorkerRow;
  workAuthPromise: Promise<WorkAuthData>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PersonalDetailsCard worker={worker} />

      <ProfessionExperienceCard
        profession={worker.profession}
        yearsExp={worker.years_exp}
      />

      <Suspense fallback={<SectionCardSkeleton lines={3} />}>
        <WorkAuthCardSlot workAuthPromise={workAuthPromise} />
      </Suspense>
    </div>
  );
}

function PersonalDetailsCard({ worker }: { worker: WorkerRow }) {
  const genderLabel =
    worker.gender === "male"
      ? "Male"
      : worker.gender === "female"
        ? "Female"
        : worker.gender || "—";

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Personal details</CardTitle>
        <CardDescription>
          Name, date of birth, and gender can&apos;t be changed here. Contact
          support if something is wrong.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-sm sm:grid-cols-[minmax(8rem,10rem)_1fr] sm:gap-x-4">
          <dt className="text-muted-foreground font-medium">First name</dt>
          <dd>{worker.first_name}</dd>
          <dt className="text-muted-foreground font-medium">Last name</dt>
          <dd>{worker.last_name}</dd>
          <dt className="text-muted-foreground font-medium">Date of birth</dt>
          <dd>
            {worker.date_of_birth
              ? format(new Date(worker.date_of_birth), "MMM d, yyyy")
              : "—"}
          </dd>
          <dt className="text-muted-foreground font-medium">Gender</dt>
          <dd>{genderLabel}</dd>
        </dl>
      </CardContent>
    </Card>
  );
}

function WorkAuthCardSlot({
  workAuthPromise,
}: {
  workAuthPromise: Promise<WorkAuthData>;
}) {
  const workAuth = use(workAuthPromise);
  const verified = workAuth?.is_verified === true;
  const [isEditing, setIsEditing] = useState(false);

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Work authorization</CardTitle>
            <CardDescription>
              Right-to-work document. Verified submissions are read-only.
            </CardDescription>
          </div>
          {!verified && !isEditing ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setIsEditing(true)}
              aria-label="Edit work authorization"
            >
              <Pencil className="size-3.5" aria-hidden />
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <WorkerAuthorizationForm
          initialWorkAuthorization={
            workAuth
              ? {
                  type: workAuth.type,
                  file_url: workAuth.file_url,
                  social_number: workAuth.social_number,
                  social_number_expiry: workAuth.social_number_expiry,
                }
              : null
          }
          workAuthorizationVerified={verified}
          profileEditMode={!verified}
          isEditing={isEditing}
          onCancelEdit={() => setIsEditing(false)}
        />
      </CardContent>
    </Card>
  );
}

export function SectionCardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <Card size="sm">
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
