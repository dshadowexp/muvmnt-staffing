import { Suspense } from "react";
import { Navbar } from "./_components/navbar";
import { NavbarSkeleton } from "./_components/navbar-skeleton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<NavbarSkeleton />}>
        <Navbar />
      </Suspense>
      <main className="pt-[var(--spacing-header)]">
        {children}
      </main>
    </>
  );
}