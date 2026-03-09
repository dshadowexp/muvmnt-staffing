import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import { config } from "../config/env";

export default fp(async (fastify) => {
    fastify.register(jwt, {
        secret: config.jwtSecret,
        sign: {
            expiresIn: config.jwtExpiresIn
        }
    });
});