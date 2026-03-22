import { z } from 'zod';
export declare const CreateAccountReply: z.ZodObject<{
    customerId: z.ZodString;
    defaultPaymentMethodId: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const SetupIntentReply: z.ZodObject<{
    clientSecret: z.ZodString;
    customerId: z.ZodString;
}, z.core.$strip>;
export declare const ListCardsReply: z.ZodArray<z.ZodObject<{
    paymentMethodId: z.ZodString;
    brand: z.ZodString;
    last4: z.ZodString;
    expMonth: z.ZodNumber;
    expYear: z.ZodNumber;
    isDefault: z.ZodBoolean;
}, z.core.$strip>>;
export declare const PaymentMethodParams: z.ZodObject<{
    paymentMethodId: z.ZodString;
}, z.core.$strip>;
export declare const RemoveCardReply: z.ZodObject<{
    success: z.ZodBoolean;
}, z.core.$strip>;
export declare const SetDefaultReply: z.ZodObject<{
    success: z.ZodBoolean;
}, z.core.$strip>;
export type PaymentMethodParamsType = z.infer<typeof PaymentMethodParams>;
