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

  if (session.role === "worker" || session.role === "candidate") {
    return (
      <div className="min-h-svh bg-background">
        {children}
      </div>
    );
  }  

  return redirect({ href: "/dashboard", locale });
}
