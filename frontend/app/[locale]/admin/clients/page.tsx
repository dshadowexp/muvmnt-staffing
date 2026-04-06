import { AdminClientsTable } from "@/features/admin/components/admin-data-tables";
import { getAdminClientsList } from "@/features/admin/dal/queries";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Clients | Admin" };

export default async function AdminClientsPage() {
  const clients = await getAdminClientsList();

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <AdminClientsTable clients={clients} />
    </div>
  );
}
