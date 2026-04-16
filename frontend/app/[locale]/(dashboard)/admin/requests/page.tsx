import { AdminJobsTable } from "@/features/admin/components/admin-data-tables";
import { getAdminJobsList } from "@/features/admin/dal/queries";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Job postings | Admin" };

export default async function AdminJobsPage() {
  const jobs = await getAdminJobsList();

  return (
    <div className="flex w-full max-w-6xl flex-col gap-4">
      <AdminJobsTable jobs={jobs} />
    </div>
  );
}
