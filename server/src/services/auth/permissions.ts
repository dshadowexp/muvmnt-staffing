
export type UserRole = 'worker' | 'client' | 'admin';

export const permissionsMap: Record<UserRole, string[]> = {
    worker: ['order:create', 'order:view'],
    client:   ['delivery:update_location'],
    admin: ['menu:update', 'order:prepare'],
};