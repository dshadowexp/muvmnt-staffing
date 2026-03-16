import "fastify";
import { JwtPayload } from '../utils/jwt';

declare module "fastify" {
    interface FastifyInstance {
        authenticate:  (request: FastifyRequest, reply: FastifyReply) => Promise<void>
        requireRole:   (roles: Role[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
        requirePermission: (permissions: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    }

    interface FastifyRequest {
        user: JwtPayload
    }
}