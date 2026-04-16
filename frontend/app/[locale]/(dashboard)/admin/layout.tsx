import {
  getAdminNavProfile,
} from "@/features/admin/dal/queries";
import { getSession } from "@/lib/session";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.role !== "admin") redirect("/app");

  const profile = await getAdminNavProfile(session.userId);
  const user = profile ?? {
    name: "Admin",
    email: session.userId,
  };

  return <>{children}</>;
}
