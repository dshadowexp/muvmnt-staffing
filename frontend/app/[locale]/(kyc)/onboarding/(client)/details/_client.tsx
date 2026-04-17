"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ContinueButton } from "@/features/onboarding/components/continue-button";
import { useOnboarding } from "@/features/onboarding/onboarding-provider";
import { useTranslatedStepError } from "@/features/onboarding/lib/use-translated-step-error";
import {
  buildClientSchema,
  ClientProfileFormInput,
  ClientProfileValues,
  mapClientProfileToFormValues,
} from "@/features/account/schemas/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { detailsAction } from "./_action";
import { useRouter } from "@/i18n/navigation";
import { ClientProfileForm } from "@/features/account/components/client-profile-form";

export function OrganizationClient({ clientProfile }: { clientProfile: ClientProfileFormInput | null }) {
  const router = useRouter();
  const { applyStepsFromServer } = useOnboarding();
  const [isPending, setIsPending] = useState(false);
  const tVal = useTranslations("kyc.onboarding.validation");
  const resolveError = useTranslatedStepError();
  const schema = useMemo(() => buildClientSchema(tVal), [tVal]);

  const form = useForm<ClientProfileValues>({
    defaultValues: clientProfile
      ? mapClientProfileToFormValues(clientProfile)
      : { name: "", type: "" },
    resolver: zodResolver(schema),
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
              toast.error(resolveError(result));
              return;
            }
            applyStepsFromServer(result.steps);
            router.push(result.redirectTo);
          } catch (e) {
            toast.error(
              e instanceof Error
                ? e.message
                : resolveError({ ok: false, error: "Something went wrong", errorKey: "somethingWentWrong" }),
            );
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
