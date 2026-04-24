import { requireAdminSession } from "@/features/admin/dal/queries";
import { listAdminInterviews } from "@/features/interviews/dal/admin-queries";
import { AdminInterviewsClient } from "./_client";

export default async function AdminInterviewsPage() {
  await requireAdminSession();

  const interviews = await listAdminInterviews();

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          Interviews
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Review completed worker interviews and submit pass or fail decisions.
        </p>
      </div>
      <AdminInterviewsClient interviews={interviews} />
    </div>
  );
}
