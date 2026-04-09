import { retrievePayrollAccountAction } from "@/features/payroll/actions";
import { PayrollClient } from "./_client";

export default async function PayrollPage() {
  const { data, error } = await retrievePayrollAccountAction();
  const initialPayroll =
    error || !data?.accountId
      ? null
      : {
          accountId: data.accountId,
          completed: data.completed,
          enabled: data.enabled,
        };

  return <PayrollClient initialPayroll={initialPayroll} />;
}