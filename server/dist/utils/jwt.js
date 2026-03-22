"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.verifyAccessToken = verifyAccessToken;
exports.decodeToken = decodeToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
function signAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, env_1.config.jwt.secret, {
        expiresIn: env_1.config.jwt.expiresIn,
        algorithm: "HS256",
    });
}
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, env_1.config.jwt.secret);
}
function decodeToken(token) {
    return jsonwebtoken_1.default.decode(token);
}
//# sourceMappingURL=jwt.js.map