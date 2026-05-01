import { OPERATOR_ROLE } from "@/features/auth/types";

/** Session / DB may still use legacy `"client"` for facility accounts. */
export function isFacilityOperatorRole(role: string | null | undefined): boolean {
  return role === OPERATOR_ROLE;
}
