"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { PaymentMethodCardType } from "../types";
import { PaymentMethodCard } from "./payment-method-card";
import { deletePaymentMethod, setDefaultPayment } from "../dal/mutations";

type Props = {
  initialCards: PaymentMethodCardType[];
  onDelete: (id: string) => void;
  onDefaultChange?: () => void;
};

export function PaymentMethodList({
  initialCards,
  onDelete,
  onDefaultChange,
}: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const t = useTranslations("kyc.onboarding.forms.billing");
  const tDash = useTranslations("dashboard.client.billing");

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const result = await deletePaymentMethod(id);
      if (result.error) throw new Error(result.error);
      onDelete(id);
    } catch {
      toast.error(t("deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    setSettingDefaultId(id);
    try {
      const result = await setDefaultPayment(id);
      if (result.error) throw new Error(result.error);
      toast.success(tDash("defaultUpdated"));
      onDefaultChange?.();
    } catch {
      toast.error(tDash("setDefaultFailed"));
    } finally {
      setSettingDefaultId(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {initialCards.map((card) => (
        <PaymentMethodCard
          key={card.id}
          card={card}
          onDelete={() => handleDelete(card.id)}
          onSelectAsDefault={
            card.isDefault ? undefined : () => handleSetDefault(card.id)
          }
          deleting={deletingId === card.id}
          settingDefault={settingDefaultId === card.id}
        />
      ))}
    </div>
  );
}
