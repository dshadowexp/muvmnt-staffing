import { FastifyInstance, FastifyRequest } from 'fastify';
import { ErrorReply } from '../../schemas';
import {
  AbandonDraftParams,
  CreateAndMatchBody,
  CreateAndMatchReply,
  FinalizeMatchBody,
  FinalizeMatchReply,
  OkReply,
} from '../../schemas/staff-requests.schema';
import {
  abandonPendingStaffRequest,
  createDraftAndMatch,
  finalizeStaffRequestFromMatch,
} from '../../services/staff-requests/staff-request.service';

export default async function staffRequestsRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/create-and-match',
    {
      onRequest: [app.authenticate, app.requireRole(['client', 'admin'])],
      schema: {
        summary: 'Create staff request draft and match nearby workers (H3 k=2)',
        tags: ['Staff requests'],
        body: CreateAndMatchBody,
        response: {
          200: CreateAndMatchReply,
          400: ErrorReply,
          401: ErrorReply,
          403: ErrorReply,
        },
      },
    },
    async (request: FastifyRequest<{ Body: unknown }>, reply) => {
      const parsed = CreateAndMatchBody.safeParse(request.body);
      if (!parsed.success) {
        const msg = parsed.error.issues[0]?.message ?? 'Invalid body';
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: msg,
        });
      }

      const b = parsed.data;
      const startDate = new Date(b.startDate);
      const endDate = b.endDate ? new Date(b.endDate) : null;

      const result = await createDraftAndMatch(request.user.sub, {
        profession: b.profession,
        startDate,
        endDate,
        startTime: b.startTime,
        endTime: b.endTime,
        requirements: b.requirements,
        tasks: b.tasks,
        positions: b.positions,
        notes: b.notes ?? '',
      });

      if (!result.ok) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: result.message,
        });
      }

      return reply.code(200).send({
        jobId: result.jobId,
        tiers: result.tiers,
        ringCellCount: result.ringCellCount,
        candidateCount: result.candidateCount,
        currency: result.currency,
      });
    },
  );

  app.post(
    '/finalize',
    {
      onRequest: [app.authenticate, app.requireRole(['client'])],
      schema: {
        summary: 'Set hourly rate and notes on a pending staff request',
        tags: ['Staff requests'],
        body: FinalizeMatchBody,
        response: {
          200: FinalizeMatchReply,
          400: ErrorReply,
          401: ErrorReply,
          403: ErrorReply,
        },
      },
    },
    async (request: FastifyRequest<{ Body: unknown }>, reply) => {
      const parsed = FinalizeMatchBody.safeParse(request.body);
      if (!parsed.success) {
        const msg = parsed.error.issues[0]?.message ?? 'Invalid body';
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: msg,
        });
      }

      const { jobId, hourlyRate, notes } = parsed.data;
      const result = await finalizeStaffRequestFromMatch(
        request.user.sub,
        jobId,
        hourlyRate,
        notes ?? '',
      );

      if (!result.ok) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: result.message,
        });
      }

      return reply.code(200).send({ ok: true as const });
    },
  );

  app.delete(
    '/:jobId/draft',
    {
      onRequest: [app.authenticate, app.requireRole(['client'])],
      schema: {
        summary: 'Delete a pending staff request (no hourly rate yet)',
        tags: ['Staff requests'],
        params: AbandonDraftParams,
        response: {
          200: OkReply,
          400: ErrorReply,
          401: ErrorReply,
          403: ErrorReply,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { jobId: string } }>,
      reply,
    ) => {
      const params = AbandonDraftParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: params.error.issues[0]?.message ?? 'Invalid job id',
        });
      }

      const result = await abandonPendingStaffRequest(
        request.user.sub,
        params.data.jobId,
      );

      if (!result.ok) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: result.message,
        });
      }

      return reply.code(200).send({ ok: true as const });
    },
  );
}
