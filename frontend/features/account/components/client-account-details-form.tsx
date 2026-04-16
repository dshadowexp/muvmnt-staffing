"use client";

import { updateClientProfileAction } from "@/features/account/actions";
import { ClientProfileForm } from "@/features/account/components/client-profile-form";
import {
  clientSchema,
  mapClientProfileToFormValues,
  type ClientProfileFormInput,
  type ClientProfileValues,
} from "@/features/account/schemas/client";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function ClientAccountDetailsForm({
  client,
}: {
  client: ClientProfileFormInput | null;
}) {
  const router = useRouter();
  const form = useForm<ClientProfileValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: client
      ? mapClientProfileToFormValues(client)
      : { name: "", type: "" },
  });

  async function onSubmit(values: ClientProfileValues) {
    const res = await updateClientProfileAction(values);
    if (res.error) {
      toast.error(res.message);
      return;
    }
    toast.success(res.message);
    router.refresh();
  }

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((v) => void onSubmit(v))}
    >
      <ClientProfileForm form={form} />
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Saving…" : "Save organization"}
      </Button>
    </form>
  );
}
