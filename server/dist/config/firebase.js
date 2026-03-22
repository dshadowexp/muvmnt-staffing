"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessaging = exports.getAuth = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const env_1 = require("./env");
if (!firebase_admin_1.default.apps.length) {
    firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.cert(env_1.config.firebase),
    });
}
const getAuth = () => firebase_admin_1.default.auth();
exports.getAuth = getAuth;
const getMessaging = () => firebase_admin_1.default.messaging();
exports.getMessaging = getMessaging;
//# sourceMappingURL=firebase.js.map