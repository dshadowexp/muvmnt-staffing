import { FastifyInstance } from 'fastify';
import authRoutes from './v1/auth.route';
import notificationsRoutes from './v1/notifications.route';
import paymentsRoutes from './v1/payments.route';
import geoRoutes from './v1/geo.route';
import storageRoutes from './v1/storage.route';
// import shiftsRoutes from './v1/shifts.route';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(authRoutes,          { prefix: '/v1/auth' });
  await app.register(notificationsRoutes, { prefix: '/v1/notifications'});
  await app.register(paymentsRoutes,      { prefix: '/v1/payments' });
  // await app.register(geoRoutes,           { prefix: '/v1/geo' });
  // await app.register(storageRoutes,       { prefix: '/v1/storage' });
  // await app.register(clientsRoutes,       { prefix: '/v1/clients' });
  // await app.register(workersRoutes,       { prefix: '/v1/workers' });
  // await app.register(shiftsRoutes,        { prefix: '/v1/shifts' });

  // ─── Health check ─────────────────────────────────────────────────────────
  app.get('/health', { logLevel: 'silent' }, async () => ({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
  }));
}