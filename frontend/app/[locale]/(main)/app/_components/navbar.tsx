import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavbarUserMenu } from "./navbar-user-menu";
import { getPresignedDownloadUrl } from "@/features/storage/dal/queries";
import { getWorkerProfile } from "@/features/profile/dal/queries";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";
import { redirect } from "next/navigation";

export async function Navbar() {
  const { authUser, user } = await getCurrentUser({ allData: true });

  if (authUser == null || user == null) return redirect("/sign-in");
  if (user.is_active == false) return redirect("/onboarding");

  let imageUrl = authUser.photoURL ?? "";
  if (user.role?.toLowerCase() === "worker") {
    const worker = await getWorkerProfile();
    if (worker?.photo_url) {
      try {
        const { url } = await getPresignedDownloadUrl(worker.photo_url);
        if (url) imageUrl = url;
      } catch {
        /* keep Firebase avatar */
      }
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-header border-b bg-background">
      <div className="container flex h-full items-center justify-between">
        <Logo href="/app" />

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <ThemeToggle />

          <NavbarUserMenu
            displayName={authUser.displayName ?? ""}
            imageUrl={imageUrl}
            role={user.role}
          />
        </div>
      </div>
    </nav>
  );
}
