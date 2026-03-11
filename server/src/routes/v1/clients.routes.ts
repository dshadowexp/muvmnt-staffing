import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ClientsService } from "../../services/users/clients.service";
import {
  ClientParams,
  ClientParamsType,
  CreateClientBody,
  CreateClientBodyType,
  UpdateClientBody,
  UpdateClientBodyType,
  PaginationQuery,
  PaginationQueryType,
  ErrorReply,
} from "../../schemas/users.schema";

export default async function clientsRoutes(app: FastifyInstance): Promise<void> {
  const clientsService = new ClientsService();
  const AnyRecord = z.record(z.string(), z.unknown());

  // ─── POST /clients ──────────────────────────────────────────────────────────
  app.post<{ Body: CreateClientBodyType }>(
    "/",
    {
      onRequest: [app.authenticate],
      schema: {
        summary: "Create a client",
        tags: ["Clients"],
        security: [{ bearerAuth: [] }],
        body: CreateClientBody,
        response: {
          200: AnyRecord, // mirrors inserted record loosely
          400: ErrorReply,
          401: ErrorReply,
        },
      },
    },
    async (request, reply) => {
      const body = CreateClientBody.parse(request.body);
      const created = await clientsService.createClient(body);
      return reply.code(200).send(created);
    }
  );

  // ─── GET /clients ───────────────────────────────────────────────────────────
  app.get<{ Querystring: PaginationQueryType }>(
    "/",
    {
      onRequest: [app.authenticate],
      schema: {
        summary: "List clients",
        tags: ["Clients"],
        security: [{ bearerAuth: [] }],
        querystring: PaginationQuery,
      },
    },
    async (request, reply) => {
      const { limit, offset } = PaginationQuery.parse(request.query);
      const clients = await clientsService.listClients({ limit, offset });
      return reply.code(200).send(clients);
    }
  );

  // ─── GET /clients/:clientId ────────────────────────────────────────────────
  app.get<{ Params: ClientParamsType }>(
    "/:clientId",
    {
      onRequest: [app.authenticate],
      schema: {
        summary: "Get client by id",
        tags: ["Clients"],
        security: [{ bearerAuth: [] }],
        params: ClientParams,
        response: {
          200: AnyRecord,
          404: ErrorReply,
          401: ErrorReply,
        },
      },
    },
    async (request, reply) => {
      const { clientId } = ClientParams.parse(request.params);
      const client = await clientsService.getClient(clientId);
      if (!client) {
        return reply.code(404).send({ statusCode: 404, error: "Not Found", message: "Client not found" });
      }
      return reply.code(200).send(client);
    }
  );

  // ─── PUT /clients/:clientId ────────────────────────────────────────────────
  app.put<{ Params: ClientParamsType; Body: UpdateClientBodyType }>(
    "/:clientId",
    {
      onRequest: [app.authenticate],
      schema: {
        summary: "Update client",
        tags: ["Clients"],
        security: [{ bearerAuth: [] }],
        params: ClientParams,
        body: UpdateClientBody,
        response: {
          200: AnyRecord,
          400: ErrorReply,
          401: ErrorReply,
          404: ErrorReply,
        },
      },
    },
    async (request, reply) => {
      const { clientId } = ClientParams.parse(request.params);
      const body = UpdateClientBody.parse(request.body);
      try {
        const updated = await clientsService.updateClient(clientId, body);
        return reply.code(200).send(updated);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Update failed";
        if (msg === "Client not found") {
          return reply.code(404).send({ statusCode: 404, error: "Not Found", message: msg });
        }
        return reply.code(400).send({ statusCode: 400, error: "Bad Request", message: msg });
      }
    }
  );

  // ─── DELETE /clients/:clientId ─────────────────────────────────────────────
  app.delete<{ Params: ClientParamsType }>(
    "/:clientId",
    {
      onRequest: [app.authenticate],
      schema: {
        summary: "Delete client",
        tags: ["Clients"],
        security: [{ bearerAuth: [] }],
        params: ClientParams,
        response: {
          200: z.object({ success: z.boolean() }),
          401: ErrorReply,
          404: ErrorReply,
        },
      },
    },
    async (request, reply) => {
      const { clientId } = ClientParams.parse(request.params);
      try {
        await clientsService.deleteClient(clientId);
        return reply.code(200).send({ success: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Delete failed";
        if (msg === "Client not found") {
          return reply.code(404).send({ statusCode: 404, error: "Not Found", message: msg });
        }
        return reply.code(400).send({ statusCode: 400, error: "Bad Request", message: msg });
      }
    }
  );
}

