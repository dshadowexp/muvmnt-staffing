import crypto from "crypto";
import { config } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const KEY = crypto
    .createHash("sha256")
    .update(config.jwt.secret)
    .digest(); // 32 bytes

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

    const encrypted = Buffer.concat([
        cipher.update(text, "utf8"),
        cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decrypt(token: string): string {
    const buffer = Buffer.from(token, "base64url");

    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
    ]);

    return decrypted.toString("utf8");
}