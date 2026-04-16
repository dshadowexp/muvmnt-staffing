import { AdminClientsTable } from "@/features/admin/components/admin-data-tables";
import { getAdminClientsList } from "@/features/admin/dal/queries";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Clients | Admin" };

export default async function AdminClientsPage() {
  const clients = await getAdminClientsList();

  return (
    <div className="flex w-full max-w-6xl flex-col gap-4">
      <AdminClientsTable clients={clients} />
    </div>
  );
}
