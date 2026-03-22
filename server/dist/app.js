"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const env_1 = require("./config/env");
const fastify_1 = __importDefault(require("fastify"));
const fastify_type_provider_zod_1 = require("fastify-type-provider-zod");
const security_plugin_1 = __importDefault(require("./plugins/security.plugin"));
const auth_plugin_1 = __importDefault(require("./plugins/auth.plugin"));
const rawBody_plugin_1 = __importDefault(require("./plugins/rawBody.plugin"));
const routes_1 = require("./routes");
const errorHandler_1 = require("./errors/errorHandler");
async function buildApp() {
    const app = (0, fastify_1.default)({
        logger: {
            level: env_1.config.logLevel,
            ...(env_1.config.nodeEnv === 'development' && {
                transport: {
                    target: 'pino-pretty',
                    options: { colorize: true, translateTime: 'HH:MM:ss' },
                },
            }),
        },
        ajv: {
            customOptions: {
                removeAdditional: 'all',
                coerceTypes: true,
                useDefaults: true,
            },
        },
    });
    app.withTypeProvider();
    app.setValidatorCompiler(fastify_type_provider_zod_1.validatorCompiler);
    app.setSerializerCompiler(fastify_type_provider_zod_1.serializerCompiler);
    // ─── Security ─────────────────────────────────────────────────────────────
    await app.register(security_plugin_1.default);
    // ─── Security ─────────────────────────────────────────────────────────────
    await app.register(auth_plugin_1.default);
    // ─── Infrastructure plugins ───────────────────────────────────────────────
    await app.register(rawBody_plugin_1.default);
    // ─── Routes ───────────────────────────────────────────────────────────────
    await (0, routes_1.registerRoutes)(app);
    // ─── Error Handler ───────────────────────────────────────────────────────────────
    app.setErrorHandler(errorHandler_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map