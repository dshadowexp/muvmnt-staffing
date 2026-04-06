import { AdminWorkersTable } from "@/features/admin/components/admin-data-tables";
import { getAdminWorkersList } from "@/features/admin/dal/queries";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Workers | Admin" };

export default async function AdminWorkersPage() {
  const workers = await getAdminWorkersList();

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <AdminWorkersTable workers={workers} />
    </div>
  );
}
