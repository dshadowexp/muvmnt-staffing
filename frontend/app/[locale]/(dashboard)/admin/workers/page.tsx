import { AdminWorkersTable } from "@/features/admin/components/admin-data-tables";
import { getAdminWorkersList } from "@/features/admin/dal/queries";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Workers | Admin" };

export default async function AdminWorkersPage() {
  const workers = await getAdminWorkersList();

  return (
    <div className="flex w-full max-w-6xl flex-col gap-4">
      <AdminWorkersTable workers={workers} />
    </div>
  );
}
