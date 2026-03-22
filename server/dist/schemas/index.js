"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorReply = void 0;
const zod_1 = require("zod");
// ─── Schemas ───────────────────────────────────────────────────────────────
// Error Response
exports.ErrorReply = zod_1.z.object({
    statusCode: zod_1.z.number(),
    error: zod_1.z.string(),
    message: zod_1.z.string(),
});
//# sourceMappingURL=index.js.map