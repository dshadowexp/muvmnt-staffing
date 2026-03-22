import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
export declare function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply): Promise<void>;
