import { FastifyInstance } from 'fastify';
import authRoutes from './v1/auth.route';
import notificationsRoutes from './v1/notifications.route';
import geoRoutes from './v1/geo.route';

// import shiftsRoutes from './v1/shifts.route';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(authRoutes,          { prefix: '/v1/auth' });
  await app.register(geoRoutes,           { prefix: '/v1/geo' });
  await app.register(notificationsRoutes, { prefix: '/v1/notifications'});
  // await app.register(shiftsRoutes,        { prefix: '/v1/shifts' });

  // ─── Health check ─────────────────────────────────────────────────────────
  app.get('/health', { logLevel: 'silent' }, async () => ({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
  }));
}