import "fastify";
import { JwtPayload } from '../utils/jwt';

declare module "fastify" {
    interface FastifyInstance {
        authenticate:  (request: FastifyRequest, reply: FastifyReply) => Promise<void>
        requireRole:   (role: string) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
        requirePermission: (permission: string) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    }

    interface FastifyRequest {
        user: JwtPayload
    }
}