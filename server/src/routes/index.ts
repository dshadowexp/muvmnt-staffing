import { FastifyInstance } from 'fastify';
import authRoutes from './v1/auth.route';
import notificationsRoutes from './v1/notifications.route';
import stripeWebhookRoutes from './v1/stripe-webhook.route';
import staffRequestsRoutes from './v1/staff-requests.route';
import shiftsRoutes from './v1/shifts.route';
import shiftEmailPublicRoutes from './v1/shift-email-public.route';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(authRoutes,          { prefix: '/v1/auth' });
  await app.register(notificationsRoutes, { prefix: '/v1/notifications'});
  await app.register(stripeWebhookRoutes, { prefix: '/v1/stripe' });
  await app.register(staffRequestsRoutes, { prefix: '/v1/staff-requests' });
  await app.register(shiftEmailPublicRoutes,  { prefix: '/v1/shifts' });
  await app.register(shiftsRoutes,            { prefix: '/v1/shifts' });

  // ─── Health check ─────────────────────────────────────────────────────────
  app.get('/health', { logLevel: 'silent' }, async () => ({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
  }));
}