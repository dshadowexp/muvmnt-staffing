import { z } from "zod";
export declare const ErrorReply: z.ZodObject<{
    statusCode: z.ZodNumber;
    error: z.ZodString;
    message: z.ZodString;
}, z.core.$strip>;
export type ErrorReplyType = z.infer<typeof ErrorReply>;
