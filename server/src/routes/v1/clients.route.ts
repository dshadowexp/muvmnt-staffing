import { FastifyInstance, FastifyRequest } from 'fastify'
import { ClientsService } from '../../services/clients/clients.service'
import {
  ClientProfileBody,
  ClientProfileBodyType,
} from '../../schemas/client.schema'

export default async function clientsRoutes(app: FastifyInstance): Promise<void> {
  const clientsService = new ClientsService()

  // ─── GET /clients/profile ───────────────────────────────────────────────────
  // Returns the authenticated client's profile, or null if not created yet.

  app.get(
    '/profile',
    {
      onRequest: [app.authenticate, app.requireRole(['client'])],
      schema: {
        summary:  "Get the current client's profile",
        tags:     ['Clients'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply) => {
      const { sub: userId } = request.user
      const profile         = await clientsService.getProfile(userId)
      return reply.code(200).send(profile)
    }
  )

  // ─── POST /clients/profile ──────────────────────────────────────────────────
  // Explicit create for the authenticated client's profile.

  app.post<{ Body: ClientProfileBodyType }>(
    '/profile',
    {
      onRequest: [app.authenticate, app.requireRole(['client'])],
      schema: {
        summary:  "Create the current client's profile",
        tags:     ['Clients'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const body            = ClientProfileBody.parse(request.body)
      const { sub: userId } = request.user

      const profile = await clientsService.upsertProfile(userId, body)
      return reply.code(201).send(profile)
    }
  )

  // ─── PUT /clients/profile ───────────────────────────────────────────────────
  // Creates or updates the authenticated client's profile (idempotent).

  app.put<{ Body: ClientProfileBodyType }>(
    '/profile',
    {
      onRequest: [app.authenticate, app.requireRole(['client'])],
      schema: {
        summary:  "Create or update the current client's profile",
        tags:     ['Clients'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const body            = ClientProfileBody.parse(request.body)
      const { sub: userId } = request.user

      const profile = await clientsService.upsertProfile(userId, body)
      return reply.code(200).send(profile)
    }
  )

  // ─── DELETE /clients/profile ────────────────────────────────────────────────
  // Deletes the authenticated client's profile.

  app.delete(
    '/profile',
    {
      onRequest: [app.authenticate, app.requireRole(['client'])],
      schema: {
        summary:  "Delete the current client's profile",
        tags:     ['Clients'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply) => {
      const { sub: userId } = request.user
      await clientsService.deleteProfile(userId)
      return reply.code(204).send()
    }
  )
}

