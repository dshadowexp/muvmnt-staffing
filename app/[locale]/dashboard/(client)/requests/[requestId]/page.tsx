import { notFound, redirect } from "next/navigation";

import { getSession } from "@/lib/get-session";
import {
  STAFF_REQUEST_STATUS_CONFIRMED,
  clientStaffRequestHref,
} from "@/features/requests/constants";
import { getStaffRequest } from "@/features/requests/dal/queries";
import { StaffRequestClientDetail } from "@/features/requests/components/staff-request-client-detail";
import { StaffRequestWorkerDetail } from "@/features/requests/components/staff-request-worker-detail";
import { getWorkerIdByUserId } from "@/features/shifts/dal/queries";

export default async function StaffRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId: id } = await params;
  const session = await getSession();
  if (!session) redirect("/sign-in");

  if (session.role === "worker") {
    const workerId = await getWorkerIdByUserId(session.userId);
    if (!workerId) notFound();
    return <StaffRequestWorkerDetail requestId={id} workerId={workerId} />;
  }

  if (session.role === "client") {
    const resume = await getStaffRequest(id);
    if (resume.error || resume.data == null) notFound();

    const staffRequest = resume.data;
    if (staffRequest.status !== STAFF_REQUEST_STATUS_CONFIRMED) {
      redirect(clientStaffRequestHref(staffRequest));
    }

    return <StaffRequestClientDetail staffRequest={staffRequest} />;
  }

  redirect("/dashboard");
}
