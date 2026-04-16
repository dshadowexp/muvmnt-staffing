import { FastifyInstance, FastifyRequest } from 'fastify';
import { ErrorReply } from '../../schemas';
import {
  AbandonDraftParams,
  ConfirmStaffRequestBody,
  CreateAndMatchReply,
  CreateStaffRequestBody,
  CreateStaffRequestReply,
  MatchWithPricingBody,
  OkReply,
  PricingTiersReply,
} from '../../schemas/staff-requests.schema';
import {
  abandonPendingStaffRequest,
  confirmStaffRequestCoverage,
  createStaffRequestDraft,
  getPricingTiersForStaffRequest,
  runStaffRequestMatchWithPricing,
} from '../../services/staff-requests/staff-request.service';

export default async function staffRequestsRoutes(app: FastifyInstance): Promise<void> {

  // ── POST /create ────────────────────────────────────────────────────────────

  app.post(
    '/create',
    {
      onRequest: [app.authenticate, app.requireRole(['client', 'admin'])],
      schema: {
        summary: 'Create staff request draft (schedule only; pricing + match follow)',
        tags:    ['Staff requests'],
        body:    CreateStaffRequestBody,
        response: {
          200: CreateStaffRequestReply,
          400: ErrorReply,
          401: ErrorReply,
          403: ErrorReply,
        },
      },
    },
    async (request: FastifyRequest<{ Body: unknown }>, reply) => {
      const raw = request.body;
      if (raw && typeof raw === 'object') {
        const o = raw as Record<string, unknown>;
        if ('startTime' in o || 'endTime' in o) {
          return reply.code(400).send({
            statusCode: 400,
            error:      'Bad Request',
            message:
              'Shift times belong under dailyWindows (per day and slot). Remove top-level startTime/endTime.',
          });
        }
      }

      const parsed = CreateStaffRequestBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          statusCode: 400,
          error:      'Bad Request',
          message:    parsed.error.issues[0]?.message ?? 'Invalid body',
        });
      }

      const b = parsed.data;

      const result = await createStaffRequestDraft(request.user.sub, {
        startDate:        new Date(b.startDate),
        endDate:          b.endDate ? new Date(b.endDate) : null,
        positions:        b.positions,
        dailyTimeWindows: b.dailyWindows,
      });

      if (!result.ok) {
        return reply.code(400).send({
          statusCode: 400,
          error:      'Bad Request',
          message:    result.message,
        });
      }

      return reply.code(200).send({ jobId: result.jobId });
    },
  );

  // ── GET /:jobId/pricing-tiers ───────────────────────────────────────────────

  app.get(
    '/:jobId/pricing-tiers',
    {
      onRequest: [app.authenticate, app.requireRole(['client', 'admin'])],
      schema: {
        summary: 'List pricing tiers for a draft request (from schedule + credentials pool)',
        tags:    ['Staff requests'],
        params:  AbandonDraftParams,
        response: {
          200: PricingTiersReply,
          400: ErrorReply,
          401: ErrorReply,
          403: ErrorReply,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { jobId: string } }>, reply) => {
      const params = AbandonDraftParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({
          statusCode: 400,
          error:      'Bad Request',
          message:    params.error.issues[0]?.message ?? 'Invalid job id',
        });
      }

      const result = await getPricingTiersForStaffRequest(request.user.sub, params.data.jobId);
      if (!result.ok) {
        return reply.code(400).send({
          statusCode: 400,
          error:      'Bad Request',
          message:    result.message,
        });
      }

      return reply.code(200).send({
        tiers:         result.tiers,
        currency:      result.currency,
        ringCellCount: result.ringCellCount,
      });
    },
  );

  // ── POST /:jobId/match ──────────────────────────────────────────────────────

  app.post(
    '/:jobId/match',
    {
      onRequest: [app.authenticate, app.requireRole(['client', 'admin'])],
      schema: {
        summary: 'Apply selected pricing tier and run worker matching',
        tags:    ['Staff requests'],
        params:  AbandonDraftParams,
        body:    MatchWithPricingBody,
        response: {
          200: CreateAndMatchReply,
          400: ErrorReply,
          401: ErrorReply,
          403: ErrorReply,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { jobId: string }; Body: unknown }>,
      reply,
    ) => {
      const params = AbandonDraftParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({
          statusCode: 400,
          error:      'Bad Request',
          message:    params.error.issues[0]?.message ?? 'Invalid job id',
        });
      }

      const parsed = MatchWithPricingBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          statusCode: 400,
          error:      'Bad Request',
          message:    parsed.error.issues[0]?.message ?? 'Invalid body',
        });
      }

      const result = await runStaffRequestMatchWithPricing(
        request.user.sub,
        params.data.jobId,
        parsed.data.pricingTier,
        parsed.data.pricingRate,
      );

      if (!result.ok) {
        return reply.code(400).send({
          statusCode: 400,
          error:      'Bad Request',
          message:    result.message,
        });
      }

      return reply.code(200).send({
        jobId:          result.jobId,
        schedule:       result.schedule,
        totalWorkers:   result.totalWorkers,
        fullyCovered:   result.fullyCovered,
        candidateCount: result.candidateCount,
        ringCellCount:  result.ringCellCount,
        currency:       result.currency,
      });
    },
  );

  // ── POST /:jobId/confirm ────────────────────────────────────────────────────

  app.post(
    '/:jobId/confirm',
    {
      onRequest: [app.authenticate, app.requireRole(['client', 'admin'])],
      schema: {
        summary: 'Confirm proposed coverage, set status confirmed, create shifts',
        tags:    ['Staff requests'],
        params:  AbandonDraftParams,
        body:    ConfirmStaffRequestBody,
        response: {
          200: OkReply,
          400: ErrorReply,
          401: ErrorReply,
          403: ErrorReply,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { jobId: string }; Body: unknown }>,
      reply,
    ) => {
      const params = AbandonDraftParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({
          statusCode: 400,
          error:      'Bad Request',
          message:    params.error.issues[0]?.message ?? 'Invalid job id',
        });
      }

      const parsed = ConfirmStaffRequestBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          statusCode: 400,
          error:      'Bad Request',
          message:    parsed.error.issues[0]?.message ?? 'Invalid body',
        });
      }

      const result = await confirmStaffRequestCoverage(
        request.user.sub,
        params.data.jobId,
        parsed.data.notes ?? null,
      );

      if (!result.ok) {
        return reply.code(400).send({
          statusCode: 400,
          error:      'Bad Request',
          message:    result.message,
        });
      }

      return reply.code(200).send({ ok: true as const });
    },
  );

  // ── DELETE /:jobId/draft ────────────────────────────────────────────────────

  app.delete(
    '/:jobId/draft',
    {
      onRequest: [app.authenticate, app.requireRole(['client'])],
      schema: {
        summary: 'Delete a pending (unconfirmed) staff request draft',
        tags:    ['Staff requests'],
        params:  AbandonDraftParams,
        response: {
          200: OkReply,
          400: ErrorReply,
          401: ErrorReply,
          403: ErrorReply,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { jobId: string } }>, reply) => {
      const params = AbandonDraftParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({
          statusCode: 400,
          error:      'Bad Request',
          message:    params.error.issues[0]?.message ?? 'Invalid job id',
        });
      }

      const result = await abandonPendingStaffRequest(request.user.sub, params.data.jobId);
      if (!result.ok) {
        return reply.code(400).send({
          statusCode: 400,
          error:      'Bad Request',
          message:    result.message,
        });
      }

      return reply.code(200).send({ ok: true as const });
    },
  );
}
