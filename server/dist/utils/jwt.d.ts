import jwt from "jsonwebtoken";
import { UserRole } from "../services/auth/permissions";
export interface JwtPayload {
    sub: string;
    role: UserRole;
    permissions: string[];
    iat?: number;
    exp?: number;
}
export declare function signAccessToken(payload: JwtPayload): string;
export declare function verifyAccessToken(token: string): JwtPayload;
export declare function decodeToken(token: string): string | jwt.JwtPayload | null;
