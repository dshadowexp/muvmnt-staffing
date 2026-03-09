import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { logger } from '../config/logger.js';

export async function errorHandler(
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    // Log the error
    logger.error({
        err: error,
        req: {
        method: request.method,
        url: request.url,
        params: request.params,
        query: request.query
        }
    }, 'Request error');

    // Zod validation errors
    if (error instanceof ZodError) {
        return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid request data',
            details: (error as any).errors.map((err: any) => ({
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