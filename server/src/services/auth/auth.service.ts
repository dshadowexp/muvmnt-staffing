import { AuthRepository } from "./auth.repository";
import { config } from "../../config/env";
import { supabase } from "../../config/supabase";
import { signAccessToken } from "../../utils/jwt";

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

    async exchangeToken(supabaseToken: string) {
        const { data, error } = await supabase.auth.getUser(supabaseToken)

        if (error || !data.user) {
            throw new Error('Invalid token')
        }

        const user = await this.repo.findOrCreateUser({ authId: data.user.id, email: data.user.email! })

        const permissions = permissionsMap[user.role as Role] ?? []

        const internalToken = signAccessToken({
            sub: user.id,
            role: user.role,
            permissions,
        });

        return { token: internalToken, expiresIn: config.jwtExpiresIn };
    }
}