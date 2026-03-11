import { FastifyInstance } from "fastify";
import { z } from "zod";
import { WorkersService } from "../../services/users/workers.service";
import {
  WorkerParams,
  WorkerParamsType,
  CreateWorkerBody,
  CreateWorkerBodyType,
  UpdateWorkerBody,
  UpdateWorkerBodyType,
  PaginationQuery,
  PaginationQueryType,
  ErrorReply,
} from "../../schemas/users.schema";

export default async function workersRoutes(app: FastifyInstance): Promise<void> {
  const workersService = new WorkersService();
  const AnyRecord = z.record(z.string(), z.unknown());

  // ─── POST /workers ──────────────────────────────────────────────────────────
  app.post<{ Body: CreateWorkerBodyType }>(
    "/",
    {
      onRequest: [app.authenticate],
      schema: {
        summary: "Create a worker",
        tags: ["Workers"],
        security: [{ bearerAuth: [] }],
        body: CreateWorkerBody,
        response: {
          200: AnyRecord,
          400: ErrorReply,
          401: ErrorReply,
        },
      },
    },
    async (request, reply) => {
      const body = CreateWorkerBody.parse(request.body);
      const created = await workersService.createWorker(body);
      return reply.code(200).send(created);
    }
  );

  // ─── GET /workers ───────────────────────────────────────────────────────────
  app.get<{ Querystring: PaginationQueryType }>(
    "/",
    {
      onRequest: [app.authenticate],
      schema: {
        summary: "List workers",
        tags: ["Workers"],
        security: [{ bearerAuth: [] }],
        querystring: PaginationQuery,
      },
    },
    async (request, reply) => {
      const { limit, offset } = PaginationQuery.parse(request.query);
      const workers = await workersService.listWorkers({ limit, offset });
      return reply.code(200).send(workers);
    }
  );

  // ─── GET /workers/:workerId ────────────────────────────────────────────────
  app.get<{ Params: WorkerParamsType }>(
    "/:workerId",
    {
      onRequest: [app.authenticate],
      schema: {
        summary: "Get worker by id",
        tags: ["Workers"],
        security: [{ bearerAuth: [] }],
        params: WorkerParams,
        response: {
          200: AnyRecord,
          404: ErrorReply,
          401: ErrorReply,
        },
      },
    },
    async (request, reply) => {
      const { workerId } = WorkerParams.parse(request.params);
      const worker = await workersService.getWorker(workerId);
      if (!worker) {
        return reply.code(404).send({ statusCode: 404, error: "Not Found", message: "Worker not found" });
      }
      return reply.code(200).send(worker);
    }
  );

  // ─── PUT /workers/:workerId ────────────────────────────────────────────────
  app.put<{ Params: WorkerParamsType; Body: UpdateWorkerBodyType }>(
    "/:workerId",
    {
      onRequest: [app.authenticate],
      schema: {
        summary: "Update worker",
        tags: ["Workers"],
        security: [{ bearerAuth: [] }],
        params: WorkerParams,
        body: UpdateWorkerBody,
        response: {
          200: AnyRecord,
          400: ErrorReply,
          401: ErrorReply,
          404: ErrorReply,
        },
      },
    },
    async (request, reply) => {
      const { workerId } = WorkerParams.parse(request.params);
      const body = UpdateWorkerBody.parse(request.body);
      try {
        const updated = await workersService.updateWorker(workerId, body);
        return reply.code(200).send(updated);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Update failed";
        if (msg === "Worker not found") {
          return reply.code(404).send({ statusCode: 404, error: "Not Found", message: msg });
        }
        return reply.code(400).send({ statusCode: 400, error: "Bad Request", message: msg });
      }
    }
  );

  // ─── DELETE /workers/:workerId ─────────────────────────────────────────────
  app.delete<{ Params: WorkerParamsType }>(
    "/:workerId",
    {
      onRequest: [app.authenticate],
      schema: {
        summary: "Delete worker",
        tags: ["Workers"],
        security: [{ bearerAuth: [] }],
        params: WorkerParams,
        response: {
          200: z.object({ success: z.boolean() }),
          401: ErrorReply,
          404: ErrorReply,
        },
      },
    },
    async (request, reply) => {
      const { workerId } = WorkerParams.parse(request.params);
      try {
        await workersService.deleteWorker(workerId);
        return reply.code(200).send({ success: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Delete failed";
        if (msg === "Worker not found") {
          return reply.code(404).send({ statusCode: 404, error: "Not Found", message: msg });
        }
        return reply.code(400).send({ statusCode: 400, error: "Bad Request", message: msg });
      }
    }
  );
}

