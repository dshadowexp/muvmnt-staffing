"use client";

import { Button } from "@/components/ui/button";
import { unstable_rethrow } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { setupPayrollAction } from "../actions";

export function CompletePayrollSetupButton() {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      await setupPayrollAction();
    } catch (error) {
      unstable_rethrow(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not start payroll setup.",
      );
    }
  }

  return (
    <Button
      type="button"
      variant="default"
      size="sm"
      className="mt-4"
      disabled={pending}
      onClick={() => void handleClick()}
    >
      {pending ? "Starting…" : "Complete payroll setup"}
    </Button>
  );
}
