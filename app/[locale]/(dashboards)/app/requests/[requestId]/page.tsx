import { notFound } from "next/navigation";

import { getSession } from "@/lib/get-session";
import {
  STAFF_REQUEST_STATUS_CONFIRMED,
  clientStaffRequestHref,
} from "@/features/requests/constants";
import { getStaffRequest } from "@/features/requests/dal/queries";
import { StaffRequestClientDetail } from "@/features/requests/components/staff-request-client-detail";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function StaffRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const locale = await getLocale();
  const { requestId: id } = await params;
  const session = await getSession();
  if (!session) return redirect({ href: "/app", locale });


  const resume = await getStaffRequest(id);
  if (resume.error || resume.data == null) notFound();

  const staffRequest = resume.data;
  if (staffRequest.status !== STAFF_REQUEST_STATUS_CONFIRMED) {
    return redirect({ href: clientStaffRequestHref(staffRequest), locale });
  }

  return <StaffRequestClientDetail staffRequest={staffRequest} />;

}
