"use client";

import { use, useActionState, useEffect, useState } from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CircleDashedIcon, LockIcon, PencilIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WorkerAuthorizationForm } from "@/features/profile/components/worker-authorization-form";
import { ProfessionExperienceCard } from "@/features/profile/components/profession-experience-card";
import { PhotoUpload } from "@/features/storage/components/photo-upload";
import { updateWorkerPhotoAction } from "@/features/profile/actions/worker-actions";
import { startIdentityVerificationAction } from "@/features/verification/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useRouter } from "@/i18n/navigation";

type WorkerRow = {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  profession: string;
  years_exp: number;
  photo_url?: string | null;
  stage?: string | null;
};

export type WorkAuthData = {
  type: string;
  file_url?: string | null;
  social_number?: string | null;
  social_number_expiry?: string | null;
  is_verified: boolean;
} | null;

export type IdentityVerificationData = {
  verified: boolean;
  verified_at: string | null;
  /** True when the worker has an existing Stripe session that can be resumed. */
  hasSession: boolean;
} | null;

export function WorkerAccountProfile({
  worker,
}: {
  worker: WorkerRow;
}) {
  const isComplianceStage = worker.stage === "compliance";
  // Profession/experience editable only in picture (null) or interview stage
  const isProfessionLocked = Boolean(worker.stage) && worker.stage !== "picture" && worker.stage !== "interview";
  return (
    <div className="flex flex-col gap-6">
      <PhotoCard photoUrl={worker.photo_url ?? null} locked={isComplianceStage} />

      <PersonalDetailsCard worker={worker} />

      <ContactDetailsCard />

      <ProfessionExperienceCard
        profession={worker.profession}
        yearsExp={worker.years_exp}
        locked={isProfessionLocked}
      />
    </div>
  );
}

function PhotoCard({
  photoUrl,
  locked = false,
}: {
  photoUrl: string | null;
  locked?: boolean;
}) {
  const router = useRouter();

  async function handleUploaded(key: string) {
    const { error, message } = await updateWorkerPhotoAction(key);
    if (error) {
      toast.error(message);
      return;
    }
    router.refresh();
  }

  async function handleRemoved() {
    const { error, message } = await updateWorkerPhotoAction("");
    if (error) toast.error(message);
    else router.refresh();
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Profile photo</CardTitle>
        <CardDescription>
          A clear, recent photo of your face helps clients recognize you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PhotoUpload
          context="avatars"
          initialFileKey={photoUrl ?? undefined}
          disabled={locked}
          onUploaded={({ key }) => { if (key) void handleUploaded(key); }}
          onFileChange={(hasFile) => { if (!hasFile) void handleRemoved(); }}
        />
      </CardContent>
    </Card>
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

function ContactDetailsCard() {
  const { firebaseUser } = useAuth();

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Contact details</CardTitle>
        <CardDescription>
          To update your email or phone number, contact support.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-sm sm:grid-cols-[minmax(8rem,10rem)_1fr] sm:gap-x-4">
          <dt className="text-muted-foreground font-medium">Email</dt>
          <dd>{firebaseUser?.email ?? "—"}</dd>
          <dt className="text-muted-foreground font-medium">Phone</dt>
          <dd>{firebaseUser?.phoneNumber ?? "—"}</dd>
        </dl>
      </CardContent>
    </Card>
  );
}

export function WorkAuthCardSlot({
  workAuthPromise,
  stage,
}: {
  workAuthPromise: Promise<WorkAuthData>;
  stage?: string | null;
}) {
  const workAuth = use(workAuthPromise);
  const verified = workAuth?.is_verified === true;
  const [isEditing, setIsEditing] = useState(false);
  const t = useTranslations("dashboard.worker.compliance");

  // Stage buckets
  const isLocked       = !stage || stage === "picture" || stage === "interview";
  const isCompliance   = stage === "compliance";
  // post-compliance: any stage beyond "compliance" (e.g. "active", "approved")
  const isPostCompliance = !isLocked && !isCompliance;

  const description = isLocked
    ? t("workAuth.descriptionInterview")
    : isPostCompliance
      ? t("workAuth.descriptionPostCompliance")
      : t("workAuth.descriptionCompliance");

  return (
    <Card size="sm" className={isLocked ? "opacity-60" : undefined}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="space-y-1">
          <CardTitle>{t("workAuth.title")}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {isLocked && <LockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
        {/* Edit button only in compliance stage, only when not yet verified and not already editing */}
        {isCompliance && !verified && !isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={() => setIsEditing(true)}
            aria-label={t("workAuth.editAria")}
            title={t("workAuth.editAria")}
          >
            <PencilIcon className="size-4" />
          </Button>
        )}
      </CardHeader>
      {/* Show form content for compliance and post-compliance — but post-compliance is read-only */}
      {!isLocked && (
        <CardContent className="flex flex-col gap-4">
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
            profileEditMode={!isLocked && !verified}
            isEditing={isCompliance && isEditing}
            onCancelEdit={() => setIsEditing(false)}
          />
          {/* Pending status — shown when work auth submitted but not yet verified and not editing */}
          {workAuth && !verified && !isEditing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CircleDashedIcon className="size-4 shrink-0 animate-spin" />
              <span>{t("statusPending")}</span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function IdentityVerificationCardSlot({
  identityVerificationPromise,
  stage,
}: {
  identityVerificationPromise: Promise<IdentityVerificationData>;
  stage?: string | null;
}) {
  const data = use(identityVerificationPromise);
  const t = useTranslations("dashboard.worker.compliance");
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    startIdentityVerificationAction,
    null,
  );

  // When the action signals that Stripe already verified the worker,
  // refresh the page so the updated DB state is reflected.
  useEffect(() => {
    if (state && "refresh" in state && state.refresh) {
      router.refresh();
    }
  }, [state, router]);

  // Stage buckets
  const isLocked        = !stage || stage === "picture" || stage === "interview";
  const isCompliance    = stage === "compliance";
  const isPostCompliance = !isLocked && !isCompliance;

  const isVerified = data?.verified === true;
  const description = isLocked
    ? t("identityVerification.descriptionInterview")
    : isPostCompliance
      ? t("identityVerification.descriptionPostCompliance")
      : t("identityVerification.descriptionCompliance");

  return (
    <Card size="sm" className={isLocked ? "opacity-60" : undefined}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="space-y-1">
          <CardTitle>{t("identityVerification.title")}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {isLocked && <LockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
      </CardHeader>
      {!isLocked && (
        <CardContent className="flex flex-col gap-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-[minmax(10rem,12rem)_1fr] sm:gap-x-4">
            <dt className="text-muted-foreground font-medium">
              {t("columnStatus")}
            </dt>
            <dd>
              {data === null
                ? "—"
                : isVerified
                  ? t("identityVerification.statusVerified")
                  : t("identityVerification.statusNotVerified")}
            </dd>
            {isVerified && data?.verified_at ? (
              <>
                <dt className="text-muted-foreground font-medium">
                  {t("identityVerification.verifiedAtLabel")}
                </dt>
                <dd>{format(new Date(data.verified_at), "MMM d, yyyy")}</dd>
              </>
            ) : null}
          </dl>
          {/*
            Begin: only when no session exists yet.
            Continue: only when an active resumable session exists.
            If a session exists but is no longer resumable (canceled/processing),
            hide the button — status row alone conveys the state.
          */}
          {isCompliance && !isVerified && (!data || data.hasSession) && (
            <form action={formAction} className="flex flex-col gap-2">
              <div>
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending
                    ? t("identityVerification.beginning")
                    : data?.hasSession
                      ? t("identityVerification.continueVerification")
                      : t("identityVerification.beginVerification")}
                </Button>
              </div>
              {state && "error" in state && state.error && (
                <p className="text-destructive text-sm">
                  {state.error}
                </p>
              )}
            </form>
          )}
        </CardContent>
      )}
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
