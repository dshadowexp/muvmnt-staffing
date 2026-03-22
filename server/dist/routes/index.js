"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const auth_route_1 = __importDefault(require("./v1/auth.route"));
const notifications_route_1 = __importDefault(require("./v1/notifications.route"));
const geo_route_1 = __importDefault(require("./v1/geo.route"));
// import shiftsRoutes from './v1/shifts.route';
async function registerRoutes(app) {
    await app.register(auth_route_1.default, { prefix: '/v1/auth' });
    await app.register(geo_route_1.default, { prefix: '/v1/geo' });
    await app.register(notifications_route_1.default, { prefix: '/v1/notifications' });
    // await app.register(shiftsRoutes,        { prefix: '/v1/shifts' });
    // ─── Health check ─────────────────────────────────────────────────────────
    app.get('/health', { logLevel: 'silent' }, async () => ({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    }));
}
//# sourceMappingURL=index.js.map