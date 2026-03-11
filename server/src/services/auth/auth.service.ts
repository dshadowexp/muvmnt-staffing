import { AuthRepository } from "./auth.repository";
import { signAccessToken } from "../../utils/jwt";
import { verifyFirebaseIdToken } from "./decode";

type Role = 'worker' | 'client' | 'admin'

const permissionsMap: Record<Role, string[]> = {
    worker: ['order:create', 'order:view'],
    client:   ['delivery:update_location'],
    admin: ['menu:update', 'order:prepare'],
}

export class AuthService {
    private readonly repo: AuthRepository

    constructor() {
        this.repo = new AuthRepository();
    }

    async exchangeToken(externalToken: string, role?: string) {
        const decoded = await verifyFirebaseIdToken(externalToken);

        const user = await this.repo.findOrCreateUser({ authId: decoded.uid, email: decoded.email ?? "", role })

        const permissions = permissionsMap[user.role as Role] ?? []

        const internalToken = signAccessToken({
            sub: user.id,
            role: user.role,
            permissions,
        });

        return { token: internalToken };
    }
}