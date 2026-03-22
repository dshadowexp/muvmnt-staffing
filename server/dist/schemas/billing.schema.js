"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetDefaultReply = exports.RemoveCardReply = exports.PaymentMethodParams = exports.ListCardsReply = exports.SetupIntentReply = exports.CreateAccountReply = void 0;
const zod_1 = require("zod");
// ─── Create account ───────────────────────────────────────────────────────────
exports.CreateAccountReply = zod_1.z.object({
    customerId: zod_1.z.string(),
    defaultPaymentMethodId: zod_1.z.string().nullable(),
});
// ─── Setup intent ─────────────────────────────────────────────────────────────
exports.SetupIntentReply = zod_1.z.object({
    clientSecret: zod_1.z.string(),
    customerId: zod_1.z.string(),
});
// ─── Card ─────────────────────────────────────────────────────────────────────
const CardReply = zod_1.z.object({
    paymentMethodId: zod_1.z.string(),
    brand: zod_1.z.string(),
    last4: zod_1.z.string(),
    expMonth: zod_1.z.number().int(),
    expYear: zod_1.z.number().int(),
    isDefault: zod_1.z.boolean(),
});
exports.ListCardsReply = zod_1.z.array(CardReply);
// ─── Payment method params ────────────────────────────────────────────────────
exports.PaymentMethodParams = zod_1.z.object({
    paymentMethodId: zod_1.z.string().min(1),
});
exports.RemoveCardReply = zod_1.z.object({
    success: zod_1.z.boolean(),
});
exports.SetDefaultReply = zod_1.z.object({
    success: zod_1.z.boolean(),
});
//# sourceMappingURL=billing.schema.js.map