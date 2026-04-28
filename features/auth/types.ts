export type UserRole = "worker" | "candidate" | "client" | "admin";

export type FacilityRole = "owner" | "manager" | "member" | "viewer";

export type UserAuth = {
  token: string;
  role: UserRole;
  userId: string;
  isActive: boolean;
  facilityId: string | null;
  facilityRole: FacilityRole | null;
};
