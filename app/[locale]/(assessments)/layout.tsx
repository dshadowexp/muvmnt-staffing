import { CANDIDATE_ROLE, STAFF_ROLE } from "@/features/auth/types";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/get-session";
import { getLocale } from "next-intl/server";

export default async function AssessmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const session = await getSession();
  if (!session) return redirect({ href: "/sign-in", locale });

  if (session.role === STAFF_ROLE || session.role === CANDIDATE_ROLE) {
    return (
      <div className="min-h-svh bg-background">
        {children}
      </div>
    );
  }  

  return redirect({ href: "/dashboard", locale });
}
