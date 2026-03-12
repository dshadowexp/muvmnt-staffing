import fp from 'fastify-plugin'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { TokenExpiredError } from 'jsonwebtoken';
import { verifyAccessToken } from '../utils/jwt'

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default fp(async function authPlugin(app: FastifyInstance) {

    // ─── app.authenticate ────────────────────────────────────────────────────
    // Verifies the Bearer token and attaches the decoded payload to request.user.
    // Use as: onRequest: [app.authenticate]

    app.decorate(
        'authenticate',
        async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
            const authHeader = request.headers.authorization

            if (!authHeader?.startsWith('Bearer ')) {
                return reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Missing Bearer token' })
            }

            const token = authHeader.slice(7);

            try {
                const payload = verifyAccessToken(token);
                request.user  = payload;
            } catch (err) {
                const message = err instanceof TokenExpiredError
                    ? 'Token expired'
                    : 'Invalid token';

                return reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message })
            }
        }
    )

    // ─── app.requireRole ─────────────────────────────────────────────────────
    // Must be used after app.authenticate — assumes request.user is populated.
    // Use as: onRequest: [app.authenticate, app.requireRole('admin')]

    app.decorate(
        'requireRole',
        function requireRole(role: string) {
            return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
                if (request.user?.role !== role) {
                    return reply.code(403).send({
                        statusCode: 403,
                        error:      'Forbidden',
                        message:    `Role '${role}' required`,
                    });
                }
            }
        }
    )

    // ─── app.requirePermission ───────────────────────────────────────────────
    // Checks the permissions array in the JWT payload.
    // Use as: onRequest: [app.authenticate, app.requirePermission('order:create')]

    app.decorate(
        'requirePermission',
        function requirePermission(permission: string) {
            return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
                if (!request.user?.permissions?.includes(permission)) {
                    return reply.code(403).send({
                        statusCode: 403,
                        error:      'Forbidden',
                        message:    `Permission '${permission}' required`,
                    });
                }
            }
        }
    )
});