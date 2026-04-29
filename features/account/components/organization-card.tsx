"use client";

import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { updateFacilityProfileAction } from "@/features/account/actions";
import { FacilityProfileForm } from "@/features/account/components/facility-profile-form";
import {
  buildClientSchema,
  mapClientProfileToFormValues,
  type ClientProfileFormInput,
  type ClientProfileFormValues,
  type ClientProfileValues,
} from "@/features/account/schemas/client";
import { AddressLocationReadonlySummary } from "@/features/geo/components/address-location-readonly-summary";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingSwap } from "@/components/ui/loading-swap";

export function OrganizationCard({
  client,
}: {
  client: ClientProfileFormInput | null;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  const defaults: ClientProfileFormValues = client
    ? mapClientProfileToFormValues(client)
    : { name: "", type: "", address: null, domainsText: "" };
  const tVal = useTranslations("kyc.onboarding.validation");
  const schema = useMemo(() => buildClientSchema(tVal), [tVal]);

  const form = useForm<ClientProfileFormValues, unknown, ClientProfileValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const {
    formState: { isDirty, isSubmitting },
  } = form;

  async function onSubmit(values: ClientProfileValues) {
    const res = await updateFacilityProfileAction(values);
    if (res.error) {
      toast.error(res.message);
      return;
    }
    toast.success(res.message);
    form.reset({
      name: values.name,
      type: values.type,
      address: values.address,
      domainsText: values.domains.join("\n"),
    });
    setIsEditing(false);
    router.refresh();
  }

  function cancelEdit() {
    form.reset(defaults);
    setIsEditing(false);
  }

  const address = client?.address ?? null;
  const tOrg = useTranslations("kyc.onboarding.forms.clientProfile");

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="py-1">Organization</CardTitle>
            <CardDescription>
              Basic information about your organization.
            </CardDescription>
          </div>
          {!isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="shrink-0"
            >
              <Pencil className="size-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <form
            onSubmit={form.handleSubmit((v) => void onSubmit(v))}
            className="space-y-4"
          >
            <fieldset
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="contents"
            >
              <FacilityProfileForm form={form} disabled={isSubmitting} />

              <div className="flex gap-2 mt-5 justify-end">
                <Button type="button" variant="ghost" onClick={cancelEdit}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!isDirty || isSubmitting}>
                  <LoadingSwap isLoading={isSubmitting}>
                    Save changes
                  </LoadingSwap>
                </Button>
              </div>
            </fieldset>
          </form>
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-[minmax(8rem,10rem)_1fr] sm:gap-x-4">
            <dt className="text-muted-foreground font-medium">Name</dt>
            <dd>{client?.name || "—"}</dd>
            <dt className="text-muted-foreground font-medium">Type</dt>
            <dd>{client?.type || "—"}</dd>
            <dt className="text-muted-foreground font-medium">{tOrg("domainsLabel")}</dt>
            <dd className="min-w-0 break-all">
              {client?.domains?.length ? client.domains.join(", ") : "—"}
            </dd>
            {address && (
              <>
                <dt className="text-muted-foreground font-medium">Address</dt>
                <dd>
                  <AddressLocationReadonlySummary location={address} />
                </dd>
              </>
            )}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
