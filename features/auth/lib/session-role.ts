import type { UserAuth, UserRole } from "@/features/auth/types";
import {
  ADMIN_ROLE,
  CANDIDATE_ROLE,
  OPERATOR_ROLE,
  STAFF_ROLE,
} from "@/features/auth/types";

/** Values that may appear in `users.role` for staff (historical `"worker"` rows). */
export const STAFF_DB_ROLE_QUERY_VALUES = [STAFF_ROLE, "worker"] as const;

export function isStaffDbRole(role: string): boolean {
  return role === STAFF_ROLE || role === "worker";
}

/**
 * Maps historical session/DB strings (`client`, `worker`) to canonical {@link UserRole}.
 */
export function canonicalUserRole(role: string): UserRole {
  if (role === "worker") return STAFF_ROLE;
  if (role === "client") return OPERATOR_ROLE;
  if (role === STAFF_ROLE) return STAFF_ROLE;
  if (role === OPERATOR_ROLE) return OPERATOR_ROLE;
  if (role === ADMIN_ROLE) return ADMIN_ROLE;
  if (role === CANDIDATE_ROLE) return CANDIDATE_ROLE;
  return OPERATOR_ROLE;
}

export function defaultAuthHomePath(
  session: Pick<UserAuth, "role" | "facilityId">,
): string {
  const role = canonicalUserRole(session.role);
  if (role === ADMIN_ROLE) return "/admin";
  if (role === CANDIDATE_ROLE) return "/s";
  if (role === STAFF_ROLE) return "/staff";
  if (role === OPERATOR_ROLE) return session.facilityId ? "/app" : "/onboarding";
  return "/";
}
