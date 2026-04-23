import { StaffRequestWorkerDetail } from "@/features/requests/components/staff-request-worker-detail";
import { getWorkerIdByUserId } from "@/features/shifts/dal/queries";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/session";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";

export default async function WorkerShiftsRequestsRequestIdPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const locale = await getLocale();
  const { requestId: id } = await params;
  const session = await getSession();
  if (!session) return redirect({ href: "/dashboard", locale });
  const workerId = await getWorkerIdByUserId(session.userId);
  if (!workerId) notFound();
  return <StaffRequestWorkerDetail requestId={id} workerId={workerId} />;
}