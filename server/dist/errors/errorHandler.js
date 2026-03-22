"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const logger_js_1 = require("../config/logger.js");
async function errorHandler(error, request, reply) {
    // Log the error
    logger_js_1.logger.error({
        err: error,
        req: {
            method: request.method,
            url: request.url,
            params: request.params,
            query: request.query
        }
    }, 'Request error');
    // Zod validation errors
    if (error instanceof zod_1.ZodError) {
        return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid request data',
            details: error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message
            }))
        });
    }
    // Fastify validation errors
    if (error.validation) {
        return reply.code(400).send({
            error: 'Validation Error',
            message: error.message,
            details: error.validation
        });
    }
    // Rate limit errors
    if (error.statusCode === 429) {
        return reply.code(429).send({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded',
            retryAfter: reply.getHeader('Retry-After')
        });
    }
    // Determine status code
    const statusCode = error.statusCode || 500;
    // Production: don't expose internal errors
    if (statusCode === 500 && process.env.NODE_ENV === 'production') {
        return reply.code(500).send({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred'
        });
    }
    // Development: include stack trace
    return reply.code(statusCode).send({
        error: error.name || 'Error',
        message: error.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
    });
}
//# sourceMappingURL=errorHandler.js.map