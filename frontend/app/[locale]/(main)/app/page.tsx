import { getSession } from "@/lib/session";
import { notFound, redirect } from "next/navigation";
import ClientAppPage from "./(client)/_client";
import WorkerAppPage from "./(worker)/_client";

export default async function AppPage() {
  const session = await getSession();
  if (!session) return redirect("/sign-in");
  if (session.role === "worker") return <WorkerAppPage />;
  if (session.role === "client") return <ClientAppPage />;
  return notFound();
}