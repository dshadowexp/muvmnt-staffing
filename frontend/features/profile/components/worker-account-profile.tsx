"use client";

import { updateWorkerProfessionAndExperienceAction } from "@/features/profile/actions/worker-actions";
import { WorkerAuthorizationForm } from "@/features/profile/components/worker-authorization-form";
import type { AddressLocation } from "@/features/geo/types";
import {
  workerProfessionExperienceSchema,
  type WorkerProfessionExperienceValues,
} from "@/features/profile/schemas/worker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/components/ui/multi-select";
import { PROFESSIONAL_ROLES } from "@/lib/constants";
import type { ProfessionalRole } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useRouter } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AddressCard } from "@/features/geo/components/address-card";

type WorkerRow = {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  profession: string;
  years_exp: number;
};

export function WorkerAccountProfile({
  worker,
  location,
  workAuthorization,
}: {
  worker: WorkerRow;
  location: AddressLocation | null;
  workAuthorization: {
    type: string;
    file_url: string;
    is_verified: boolean;
  } | null;
}) {
  const router = useRouter();
  const form = useForm<WorkerProfessionExperienceValues>({
    resolver: zodResolver(workerProfessionExperienceSchema),
    defaultValues: {
      profession: worker.profession as ProfessionalRole,
      yearsExp: worker.years_exp,
    },
  });

  async function onSubmit(values: WorkerProfessionExperienceValues) {
    const res = await updateWorkerProfessionAndExperienceAction(values);
    if (res.error) {
      toast.error(res.message);
      return;
    }
    toast.success(res.message);
    router.refresh();
  }

  const genderLabel =
    worker.gender === "male"
      ? "Male"
      : worker.gender === "female"
        ? "Female"
        : worker.gender || "—";

  return (
    <div className="flex flex-col gap-6">
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

      <Card size="sm">
        <CardHeader>
          <CardTitle>Address</CardTitle>
          <CardDescription>
            Your location for matching and compliance. Changes save when you
            finish editing the address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddressCard
            value={location ?? undefined}
            onChange={(loc) => {}}
            label="Your address"
          />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Profession & experience</CardTitle>
          <CardDescription>Update your role and years of experience.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((v) => void onSubmit(v))}
          >
            <FieldGroup>
              <Field data-invalid={!!form.formState.errors.profession}>
                <FieldLabel>Profession</FieldLabel>
                <FieldDescription>Your primary healthcare role</FieldDescription>
                <input type="hidden" {...form.register("profession")} />
                <MultiSelect
                  single
                  values={
                    form.watch("profession")
                      ? [form.watch("profession")]
                      : []
                  }
                  onValuesChange={(v) =>
                    form.setValue("profession", (v[0] ?? "") as ProfessionalRole, {
                      shouldValidate: true,
                    })
                  }
                >
                  <MultiSelectTrigger className="w-full">
                    <MultiSelectValue placeholder="Select profession..." />
                  </MultiSelectTrigger>
                  <MultiSelectContent search={{ placeholder: "Search profession..." }}>
                    <MultiSelectGroup>
                      {(PROFESSIONAL_ROLES as ProfessionalRole[]).map((role) => (
                        <MultiSelectItem key={role} value={role}>
                          {role}
                        </MultiSelectItem>
                      ))}
                    </MultiSelectGroup>
                  </MultiSelectContent>
                </MultiSelect>
                <FieldError>{form.formState.errors.profession?.message}</FieldError>
              </Field>
              <Field data-invalid={!!form.formState.errors.yearsExp}>
                <FieldLabel htmlFor="account-years-exp">Years of experience</FieldLabel>
                <Input
                  id="account-years-exp"
                  type="number"
                  min={0}
                  step={1}
                  {...form.register("yearsExp", { valueAsNumber: true })}
                />
                <FieldError>{form.formState.errors.yearsExp?.message}</FieldError>
              </Field>
            </FieldGroup>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Work authorization</CardTitle>
          <CardDescription>
            Right-to-work document. Verified submissions are read-only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkerAuthorizationForm
            initialWorkAuthorization={
              workAuthorization
                ? {
                    type: workAuthorization.type,
                    file_url: workAuthorization.file_url,
                  }
                : null
            }
            workAuthorizationVerified={workAuthorization?.is_verified === true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
