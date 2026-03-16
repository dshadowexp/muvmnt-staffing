import jwt from "jsonwebtoken"
import { config } from "../config/env"
import { UserRole } from "../services/auth/permissions"

export interface JwtPayload {
    sub:         string
    role:        UserRole
    permissions: string[]
    iat?:        number
    exp?:        number
}

export function signAccessToken(payload: JwtPayload) {
    return jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
        algorithm: "HS256",
    });
}

export function verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwt.secret) as JwtPayload;
}

export function decodeToken(token: string) {
    return jwt.decode(token);
}