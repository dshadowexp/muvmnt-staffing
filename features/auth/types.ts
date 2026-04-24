export type UserRole = "worker" | "client" | "admin";

export type UserAuth = { token: string, role: UserRole, userId: string, isActive: boolean };