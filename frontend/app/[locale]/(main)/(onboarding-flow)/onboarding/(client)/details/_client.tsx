"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { useOnboarding } from "@/features/onboarding/onboarding-provider";
import { ClientProfileForm } from "@/features/profile/components/client-profile-form";
import {
  ClientProfileFormInput,
  ClientProfileValues,
  clientSchema,
  mapClientProfileToFormValues,
} from "@/features/profile/schemas/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { detailsAction } from "./_action";
import { useRouter } from "@/i18n/navigation";

export function OrganizationClient({ clientProfile }: { clientProfile: ClientProfileFormInput | null }) {
  const router = useRouter();
  const { applyStepsFromServer } = useOnboarding();
  const [isPending, setIsPending] = useState(false);
  const form = useForm<ClientProfileValues>({
    defaultValues: clientProfile
      ? mapClientProfileToFormValues(clientProfile)
      : { name: "", type: "" },
    resolver: zodResolver(clientSchema),
  });

  return (
    <form
      className="space-y-6"
      onSubmit={form.handleSubmit((data) => {
        void (async () => {
          setIsPending(true);
          try {
            const result = await detailsAction(data);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            applyStepsFromServer(result.steps);
            router.push(result.redirectTo);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
          } finally {
            setIsPending(false);
          }
        })();
      })}
    >
      <ClientProfileForm form={form} />
      <ContinueButton pending={isPending} />
    </form>
  );
}
