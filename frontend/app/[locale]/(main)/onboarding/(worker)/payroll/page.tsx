import SetupPayroll from "@/features/billing/components/setup-payroll";
import { PayrollClient } from "./_client";

export default function PayrollPage() {
    return (
        <>
            <SetupPayroll />
            <PayrollClient />
        </>
    );
}