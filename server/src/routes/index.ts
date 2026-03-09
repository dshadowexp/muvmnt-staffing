import { FastifyInstance } from 'fastify';
import authRoutes from './v1/auth.routes';
import paymentRoutes from './v1/payments.routes';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(authRoutes,         { prefix: '/v1/auth' });
  await app.register(paymentRoutes,      { prefix: '/v1/payments' });

  // ─── Health check ─────────────────────────────────────────────────────────
  app.get('/health', { logLevel: 'silent' }, async () => ({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
  }));
}