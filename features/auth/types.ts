export type UserRole = "worker" | "candidate" | "client" | "admin" ;

export type UserAuth = { token: string, role: UserRole, userId: string, isActive: boolean };