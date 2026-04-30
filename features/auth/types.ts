export const STAFF_ROLE = "staff";

export const CANDIDATE_ROLE = "candidate";

export const OPERATOR_ROLE = "operator";

export const ADMIN_ROLE = "admin";

export type UserRole = typeof STAFF_ROLE | typeof CANDIDATE_ROLE | typeof OPERATOR_ROLE | typeof ADMIN_ROLE;

export const OPERATOR_OWNER_PERMISSION = "owner";

export const OPERATOR_MANAGER_PERMISSION = "manager";

export const OPERATOR_MEMBER_PERMISSION = "member";

export const OPERATOR_VIEWER_PERMISSION = "viewer";

export type OperatorPermission = typeof OPERATOR_OWNER_PERMISSION | typeof OPERATOR_MANAGER_PERMISSION | typeof OPERATOR_MEMBER_PERMISSION | typeof OPERATOR_VIEWER_PERMISSION;

export type UserAuth = {
  token: string;
  role: UserRole;
  userId: string;
  isActive: boolean;
  facilityId: string | null;
  facilityRole: OperatorPermission | null;
};
