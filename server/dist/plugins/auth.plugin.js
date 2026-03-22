"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const jsonwebtoken_1 = require("jsonwebtoken");
const jwt_1 = require("../utils/jwt");
// ─── Plugin ───────────────────────────────────────────────────────────────────
exports.default = (0, fastify_plugin_1.default)(async function authPlugin(app) {
    // ─── app.authenticate ────────────────────────────────────────────────────
    // Verifies the Bearer token and attaches the decoded payload to request.user.
    // Use as: onRequest: [app.authenticate]
    app.decorate('authenticate', async function authenticate(request, reply) {
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Missing Bearer token' });
        }
        const token = authHeader.slice(7);
        try {
            const payload = (0, jwt_1.verifyAccessToken)(token);
            request.user = payload;
        }
        catch (err) {
            const message = err instanceof jsonwebtoken_1.TokenExpiredError
                ? 'Token expired'
                : 'Invalid token';
            return reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message });
        }
    });
    // ─── app.requireRole ─────────────────────────────────────────────────────
    // Must be used after app.authenticate — assumes request.user is populated.
    // Use as: onRequest: [app.authenticate, app.requireRole('admin')]
    // server/src/plugins/auth.plugin.ts
    app.decorate('requireRole', function requireRole(roles) {
        return async function (request, reply) {
            const userRole = request.user?.role;
            if (!userRole || !roles.includes(userRole)) {
                return reply.code(403).send({
                    statusCode: 403,
                    error: 'Forbidden',
                    message: `Role${roles.length > 1 ? 's' : ''} '${roles.join(", ")}' required`,
                });
            }
        };
    });
    // ─── app.requirePermission ───────────────────────────────────────────────
    // Checks the permissions array in the JWT payload.
    // Use as: onRequest: [app.authenticate, app.requirePermission('order:create')]
    app.decorate('requirePermission', function requirePermission(permissions) {
        return async function (request, reply) {
            // if (!request.user?.permissions?.includes(permission)) {
            //     return reply.code(403).send({
            //         statusCode: 403,
            //         error:      'Forbidden',
            //         message:    `Permission '${permission}' required`,
            //     });
            // }
        };
    });
});
//# sourceMappingURL=auth.plugin.js.map