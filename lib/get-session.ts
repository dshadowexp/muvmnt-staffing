import { cache } from "react";
import { cookies } from "next/headers";
import type { UserAuth } from "@/features/auth/types";

/** Cookie read deduped per request — safe to await from multiple Server Components. */
export const getSession = cache(async (): Promise<UserAuth | null> => {
  const raw = (await cookies()).get("session")?.value;
  if (!raw) return null;
  return JSON.parse(raw) as UserAuth;
});
