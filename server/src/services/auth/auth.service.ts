import { FastifyInstance } from "fastify";
import { AuthRepository } from "./auth.repository";
import { config } from "../../config/env";

type Role = 'customer' | 'driver' | 'merchant'

const permissionsMap: Record<Role, string[]> = {
    customer: ['order:create', 'order:view'],
    driver:   ['delivery:update_location'],
    merchant: ['menu:update', 'order:prepare'],
}

export class AuthService {
    private readonly repo: AuthRepository

    constructor(private readonly app: FastifyInstance) {
        this.repo = new AuthRepository(app);
    }

    async exchangeToken(supabaseToken: string) {
        const { data, error } = await this.app.supabase.auth.getUser(supabaseToken)

        if (error || !data.user) {
            throw new Error('Invalid token')
        }

        const user = await this.repo.findOrCreateUser({ authId: data.user.id, email: data.user.email!})

        const permissions = permissionsMap[user.role as Role] ?? []

        const internalToken = this.app.jwt.sign({
            sub: user.id,
            role: user.role,
            permissions,
        })

        return { token: internalToken, expiresIn: config.jwtExpiresIn }
    }
}