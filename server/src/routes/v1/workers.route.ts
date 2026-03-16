import { FastifyInstance, FastifyRequest } from 'fastify'
import { WorkersService } from '../../services/workers/workers.service'
import {
  WorkerProfileBody,
  WorkerProfileBodyType,
} from '../../schemas/worker.schema'

export default async function workersRoutes(app: FastifyInstance): Promise<void> {
  const workersService = new WorkersService()

  // ─── GET /workers/profile ───────────────────────────────────────────────────
  // Returns the authenticated worker's profile, or null if not created yet.

  app.get(
    '/profile',
    {
      onRequest: [app.authenticate, app.requireRole(['worker'])],
      schema: {
        summary:  "Get the current worker's profile",
        tags:     ['Workers'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply) => {
      const { sub: userId } = request.user
      const profile         = await workersService.getProfile(userId)
      return reply.code(200).send(profile)
    }
  )

  // ─── PUT /workers/profile ───────────────────────────────────────────────────
  // Creates or updates the authenticated worker's profile (idempotent).

  app.put<{ Body: WorkerProfileBodyType }>(
    '/profile',
    {
      onRequest: [app.authenticate, app.requireRole(['worker'])],
      schema: {
        summary:  "Create or update the current worker's profile",
        tags:     ['Workers'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const body            = WorkerProfileBody.parse(request.body)
      const { sub: userId } = request.user

      const profile = await workersService.upsertProfile(userId, body)
      return reply.code(200).send(profile)
    }
  )

  // ─── DELETE /workers/profile ────────────────────────────────────────────────
  // Deletes the authenticated worker's profile.

  app.delete(
    '/profile',
    {
      onRequest: [app.authenticate, app.requireRole(['worker'])],
      schema: {
        summary:  "Delete the current worker's profile",
        tags:     ['Workers'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply) => {
      const { sub: userId } = request.user
      await workersService.deleteProfile(userId)
      return reply.code(204).send()
    }
  )
}

