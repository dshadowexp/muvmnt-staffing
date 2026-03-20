import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard | Muvmnt" };

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      { children }
    </>
  );
}
