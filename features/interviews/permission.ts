import { getSession } from "@/lib/get-session";
import { countInterviewsForUser } from "./dal/queries";

export async function canCreateInterview() {
  return true;
}

export async function getUserInterviewCount() {
  const session = await getSession();
  if (!session) return 0;
  return countInterviewsForUser(session.userId);
}
