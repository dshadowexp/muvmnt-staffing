"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const env_1 = require("../config/env");
// import { getRedisCluster } from "../config/redis";
const allowedOrigins = [
    "http://localhost:3000",
    "https://muvmnt-staffing.vercel.app",
];
exports.default = (0, fastify_plugin_1.default)(async (fastify) => {
    await fastify.register(helmet_1.default, {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https:']
            }
        }
    });
    await fastify.register(cors_1.default, {
        origin: (origin, cb) => {
            if (!origin || allowedOrigins.includes(origin)) {
                return cb(null, true);
            }
            return cb(new Error('Not allowed'), false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    });
    await fastify.register(rate_limit_1.default, {
        max: env_1.config.rateLimit.max,
        timeWindow: env_1.config.rateLimit.timeWindow,
        // redis: getRedisCluster(),
        skipOnError: false,
        addHeaders: {
            'x-ratelimit-limit': true,
            'x-ratelimit-remaining': true,
            'x-ratelimit-reset': true,
            'retry-after': true
        }
    });
});
//# sourceMappingURL=security.plugin.js.map