import { retrievePayrollAccountAction } from "@/features/payroll/actions";
import { CompletePayrollSetupButton } from "@/features/payroll/components/complete-payroll-setup-button";
import { WorkerPayrollBalances } from "@/features/payroll/components/worker-payroll-balances";

export default async function WorkerPayrollPage() {
  const { data, error } = await retrievePayrollAccountAction();
  const hasAccount = !error && data?.accountId;

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Payroll</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          View your Stripe Connect balance and manage payouts.
        </p>
      </div>

      {hasAccount ? (
        <WorkerPayrollBalances />
      ) : (
        <div className="border-border bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
          <p className="text-muted-foreground text-sm">
            {error
              ? "We couldn't load your payroll details. You can still complete or resume setup below."
              : "Set up your payroll account to view your balance and manage payouts."}
          </p>
          <CompletePayrollSetupButton />
        </div>
      )}
    </div>
  );
}
