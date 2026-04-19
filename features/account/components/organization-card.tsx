"use client";

import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { updateClientProfileAction } from "@/features/account/actions";
import { ClientProfileForm } from "@/features/account/components/client-profile-form";
import {
  buildClientSchema,
  mapClientProfileToFormValues,
  type ClientProfileFormInput,
  type ClientProfileValues,
} from "@/features/account/schemas/client";
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

  const defaults: ClientProfileValues = client
    ? mapClientProfileToFormValues(client)
    : { name: "", type: "" };
  const tVal = useTranslations("kyc.onboarding.validation");
  const schema = useMemo(() => buildClientSchema(tVal), [tVal]);

  const form = useForm<ClientProfileValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const {
    formState: { isDirty, isSubmitting },
  } = form;

  async function onSubmit(values: ClientProfileValues) {
    const res = await updateClientProfileAction(values);
    if (res.error) {
      toast.error(res.message);
      return;
    }
    toast.success(res.message);
    // Rebaseline RHF so `isDirty` resets against the freshly saved values.
    form.reset(values);
    setIsEditing(false);
    router.refresh();
  }

  function cancelEdit() {
    form.reset(defaults);
    setIsEditing(false);
  }

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="py-1">Organization</CardTitle>
            <CardDescription>
              Your facility or business name and type.
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
              <ClientProfileForm form={form} />
              <div className="flex gap-2">
                <Button type="submit" disabled={!isDirty || isSubmitting}>
                  <LoadingSwap isLoading={isSubmitting}>
                    Save changes
                  </LoadingSwap>
                </Button>
                <Button type="button" variant="ghost" onClick={cancelEdit}>
                  Cancel
                </Button>
              </div>
            </fieldset>
          </form>
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-[minmax(8rem,10rem)_1fr] sm:gap-x-4">
            <dt className="text-muted-foreground font-medium">
              Organization name
            </dt>
            <dd>{client?.name || "—"}</dd>
            <dt className="text-muted-foreground font-medium">Type</dt>
            <dd>{client?.type || "—"}</dd>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
