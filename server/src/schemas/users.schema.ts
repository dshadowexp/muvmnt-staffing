import { z } from "zod";

// ─── Shared ───────────────────────────────────────────────────────────────────

export const ErrorReply = z.object({
  statusCode: z.number(),
  error: z.string(),
  message: z.string(),
});

export const PaginationQuery = z.object({
  limit: z
    .coerce
    .number()
    .int()
    .positive()
    .max(100)
    .optional(),
  offset: z
    .coerce
    .number()
    .int()
    .nonnegative()
    .optional(),
});

// ─── Clients ──────────────────────────────────────────────────────────────────

export const ClientParams = z.object({
  clientId: z.string().uuid("Invalid client ID"),
});

// Accept arbitrary columns but provide a canonical mapping for userId → user_id
export const CreateClientBody = z
  .object({
    userId: z.string().uuid("Invalid user ID").optional(),
  })
  .passthrough();

export const UpdateClientBody = z
  .object({
    userId: z.string().uuid("Invalid user ID").optional(),
  })
  .passthrough();

// ─── Workers ──────────────────────────────────────────────────────────────────

export const WorkerParams = z.object({
  workerId: z.string().uuid("Invalid worker ID"),
});

export const CreateWorkerBody = z
  .object({
    userId: z.string().uuid("Invalid user ID").optional(),
  })
  .passthrough();

export const UpdateWorkerBody = z
  .object({
    userId: z.string().uuid("Invalid user ID").optional(),
  })
  .passthrough();

// ─── Types ────────────────────────────────────────────────────────────────────

export type ErrorReplyType = z.infer<typeof ErrorReply>;
export type PaginationQueryType = z.infer<typeof PaginationQuery>;

export type ClientParamsType = z.infer<typeof ClientParams>;
export type CreateClientBodyType = z.infer<typeof CreateClientBody>;
export type UpdateClientBodyType = z.infer<typeof UpdateClientBody>;

export type WorkerParamsType = z.infer<typeof WorkerParams>;
export type CreateWorkerBodyType = z.infer<typeof CreateWorkerBody>;
export type UpdateWorkerBodyType = z.infer<typeof UpdateWorkerBody>;
