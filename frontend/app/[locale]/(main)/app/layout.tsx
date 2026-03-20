import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { redirect } from "next/navigation";
import { Navbar } from "./_components/navbar";
import { UserRole } from "@/types/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { authUser, user } = await getCurrentUser();

  if (authUser == null) return redirect("/sign-in");
  if (user == null || user.is_active == false) return redirect("/onboarding");

  return (
    <>
      <Navbar user={{ name: authUser.displayName ?? "", imageUrl: authUser.photoURL ?? "", role: user?.role as UserRole }} />
      <main className="pt-[var(--spacing-header)]">{children}</main>
    </>
  );
}