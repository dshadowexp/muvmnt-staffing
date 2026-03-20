"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { retrievePayrollAccountAction, setupPayrollAction } from "@/features/billing/actions";

export default function SetupPayroll() {
  const [loading, setLoading] = useState(false);
  const [payrollComplete, setPayrollComplete] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    async function retrieveAccountLink() {
      setFetching(true);
      try {
        const { data, error } = await retrievePayrollAccountAction();
        if (error) throw new Error(error);
        setPayrollComplete(data?.enabled ?? false);
      } catch {
        setPayrollComplete(false);
      } finally {
        setFetching(false);
      }
    }
    retrieveAccountLink();
  }, []);

  async function handleSetup() {
    setLoading(true);
    try {
      await setupPayrollAction();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
        <h6 className="text-sm font-medium text-muted-foreground">
          Loading...
        </h6>
    )
  }

  if (payrollComplete) {
    return (
      <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
        <Check className="size-4" />
        Complete
      </div>
    );
  }

  return (
    <Button onClick={handleSetup} disabled={loading} className="w-fit">
      <LoadingSwap isLoading={loading} >
        Begin
      </LoadingSwap>
    </Button>
  );
}