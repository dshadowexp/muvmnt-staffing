import type { Metadata } from "next";

export const metadata: Metadata = { title: "App | Muvmnt" };

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      { children }
    </>
  );
}
