"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { ReferralDialog } from "./referral-dialog";

export function ReferralPageClient({ role }: { role: "worker" | "client" }) {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  return (
    <ReferralDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) router.back();
      }}
      role={role}
    />
  );
}
