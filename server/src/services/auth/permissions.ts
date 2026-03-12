
export type Role = 'worker' | 'client' | 'admin';

export const permissionsMap: Record<Role, string[]> = {
    worker: ['order:create', 'order:view'],
    client:   ['delivery:update_location'],
    admin: ['menu:update', 'order:prepare'],
};