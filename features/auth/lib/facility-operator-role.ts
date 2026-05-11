import { OPERATOR_ROLE } from "@/features/auth/types";

export function isFacilityOperatorRole(role: string | null | undefined): boolean {
  return role === OPERATOR_ROLE;
}
