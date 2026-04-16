import { FastifyInstance, FastifyRequest } from 'fastify';
import { ErrorReply } from '../../schemas';
import { ShiftIdParams } from '../../schemas/shifts.schema';
import {
  OkReply,
} from '../../schemas/staff-requests.schema';
import { completeClientShift } from '../../services/shifts/client-shift-actions.service';
import {
  cancelWorkerShift,
  checkInWorkerShift,
  checkOutWorkerShift,
  confirmWorkerShift,
  declineWorkerShift,
  requestWorkerShiftTransfer,
} from '../../services/shifts/worker-shift-actions.service';

export default async function shiftsRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/:shiftId/confirm',
    {
      onRequest: [app.authenticate, app.requireRole(['worker'])],
      schema: {
        summary: 'Worker confirms a scheduled shift',
        tags:    ['Shifts'],
        params:  ShiftIdParams,
        response: { 200: OkReply, 400: ErrorReply, 401: ErrorReply, 403: ErrorReply },
      },
    },
    async (request: FastifyRequest<{ Params: { shiftId: string } }>, reply) => {
      const params = ShiftIdParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({
          statusCode: 400,
          error:      'Bad Request',
          message:    params.error.issues[0]?.message ?? 'Invalid shift id',
        });
      }

      const result = await confirmWorkerShift(request.user.sub, params.data.shiftId);
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

  app.post(
    '/:shiftId/decline',
    {
      onRequest: [app.authenticate, app.requireRole(['worker'])],
      schema: {
        summary: 'Worker declines; reassigns another worker when possible',
        tags:    ['Shifts'],
        params:  ShiftIdParams,
        response: { 200: OkReply, 400: ErrorReply, 401: ErrorReply, 403: ErrorReply },
      },
    },
    async (request: FastifyRequest<{ Params: { shiftId: string } }>, reply) => {
      const params = ShiftIdParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({
          statusCode: 400,
          error:      'Bad Request',
          message:    params.error.issues[0]?.message ?? 'Invalid shift id',
        });
      }

      const result = await declineWorkerShift(request.user.sub, params.data.shiftId);
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

  app.post(
    '/:shiftId/check-in',
    {
      onRequest: [app.authenticate, app.requireRole(['worker'])],
      schema: {
        summary: 'Worker checks in — confirmed shift becomes in progress',
        tags:    ['Shifts'],
        params:  ShiftIdParams,
        response: { 200: OkReply, 400: ErrorReply, 401: ErrorReply, 403: ErrorReply },
      },
    },
    async (request: FastifyRequest<{ Params: { shiftId: string } }>, reply) => {
      const params = ShiftIdParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({
          statusCode: 400,
          error:      'Bad Request',
          message:    params.error.issues[0]?.message ?? 'Invalid shift id',
        });
      }

      const result = await checkInWorkerShift(request.user.sub, params.data.shiftId);
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

  app.post(
    '/:shiftId/check-out',
    {
      onRequest: [app.authenticate, app.requireRole(['worker'])],
      schema: {
        summary: 'Worker checks out — in-progress shift becomes checked out',
        tags:    ['Shifts'],
        params:  ShiftIdParams,
        response: { 200: OkReply, 400: ErrorReply, 401: ErrorReply, 403: ErrorReply },
      },
    },
    async (request: FastifyRequest<{ Params: { shiftId: string } }>, reply) => {
      const params = ShiftIdParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({
          statusCode: 400,
          error:      'Bad Request',
          message:    params.error.issues[0]?.message ?? 'Invalid shift id',
        });
      }

      const result = await checkOutWorkerShift(request.user.sub, params.data.shiftId);
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

  app.post(
    '/:shiftId/complete',
    {
      onRequest: [app.authenticate, app.requireRole(['client'])],
      schema: {
        summary: 'Client marks a checked-out shift complete (triggers worker payout job)',
        tags:    ['Shifts'],
        params:  ShiftIdParams,
        response: { 200: OkReply, 400: ErrorReply, 401: ErrorReply, 403: ErrorReply },
      },
    },
    async (request: FastifyRequest<{ Params: { shiftId: string } }>, reply) => {
      const params = ShiftIdParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({
          statusCode: 400,
          error:      'Bad Request',
          message:    params.error.issues[0]?.message ?? 'Invalid shift id',
        });
      }

      const result = await completeClientShift(request.user.sub, params.data.shiftId);
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

  app.post(
    '/:shiftId/transfer',
    {
      onRequest: [app.authenticate, app.requireRole(['worker'])],
      schema: {
        summary:
          'Worker requests reassignment — enqueues background matching; shift marked reassigning until done',
        tags:    ['Shifts'],
        params:  ShiftIdParams,
        response: { 200: OkReply, 400: ErrorReply, 401: ErrorReply, 403: ErrorReply },
      },
    },
    async (request: FastifyRequest<{ Params: { shiftId: string } }>, reply) => {
      const params = ShiftIdParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({
          statusCode: 400,
          error:      'Bad Request',
          message:    params.error.issues[0]?.message ?? 'Invalid shift id',
        });
      }

      const result = await requestWorkerShiftTransfer(request.user.sub, params.data.shiftId);
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

  app.delete(
    '/:shiftId',
    {
      onRequest: [app.authenticate, app.requireRole(['worker'])],
      schema: {
        summary: 'Worker cancels a scheduled shift',
        tags:    ['Shifts'],
        params:  ShiftIdParams,
        response: { 200: OkReply, 400: ErrorReply, 401: ErrorReply, 403: ErrorReply },
      },
    },
    async (request: FastifyRequest<{ Params: { shiftId: string } }>, reply) => {
      const params = ShiftIdParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({
          statusCode: 400,
          error:      'Bad Request',
          message:    params.error.issues[0]?.message ?? 'Invalid shift id',
        });
      }

      const result = await cancelWorkerShift(request.user.sub, params.data.shiftId);
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
