"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { PaymentMethodCardType } from "../types";
import { PaymentMethodCard } from "./payment-method-card";
import { deletePaymentMethod } from "../dal/mutations";

type Props = {
  initialCards: PaymentMethodCardType[];
  onDelete: (id: string) => void;
};

export function PaymentMethodList({ initialCards, onDelete }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const t = useTranslations("kyc.onboarding.forms.billing");

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await deletePaymentMethod(id);
      if (error) throw new Error(error);
      onDelete(id);
    } catch {
      toast.error(t("deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {initialCards.map((card) => (
        <PaymentMethodCard
          key={card.id}
          card={card}
          onDelete={() => handleDelete(card.id)}
          deleting={deletingId === card.id}
        />
      ))}
    </div>
  );
}
