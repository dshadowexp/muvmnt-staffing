import { FastifyInstance, FastifyRequest } from 'fastify';
import { NotificationService } from '../../services/notifications/notifications.service';
import { SendNotificationBody, SendNotificationBodyType, UpsertFcmTokenBody, UpsertFcmTokenBodyType } from '../../schemas/notifications.schema';
import { getNotificationsQueue } from '../../background/notifications.queue';
import { logger } from '../../config/logger';

export default async function notificationsRoutes(app: FastifyInstance): Promise<void> {
    const notificationService = new NotificationService();

    // ─── POST /notifications/send ─────────────────────────────────────────────
    // Enqueues a notification across one or more channels.

    app.post<{ Body: SendNotificationBodyType }>(
        '/send',
        {
            onRequest: [app.authenticate],
            schema: {
                summary:  'Enqueue a notification',
                tags:     ['Notifications'],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request, reply) => {
            const body = SendNotificationBody.parse(request.body);
            const { sub, role }  = request.user;
            logger.info({ sub, role, userId: body.userId }, 'Enqueueing notification')
            if (body.userId !== sub && role !== 'admin') {
                return reply.code(403).send({
                    statusCode: 403,
                    error:      'Forbidden',
                    message:    'You can only enqueue notifications for your own user id',
                });
            }
            
            await getNotificationsQueue().enqueue(body);
            return reply.code(202).send({ success: true });
        }
    )

    // ─── PUT /notifications/fcm-token ─────────────────────────────────────────
    // Called by the mobile app whenever the FCM token is issued or rotated.
    // userId is taken from the JWT — users can only update their own token.

    app.put<{ Body: UpsertFcmTokenBodyType }>(
        '/push-token',
        {
            onRequest: [app.authenticate],
            schema: {
                summary:  'Register or update FCM push token',
                tags:     ['Notifications'],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request: FastifyRequest<{ Body: UpsertFcmTokenBodyType }>, reply) => {
            const { token, platform } = UpsertFcmTokenBody.parse(request.body);
            const userId = (request.user as any).sub;

            await notificationService.upsertFcmToken({ userId, token, platform });
            return reply.code(200).send({ success: true });
        }
    )

    // ─── DELETE /notifications/fcm-token/:platform ────────────────────────────
    // Called on logout to deregister the token so the user stops receiving push.

    app.delete<{ Params: { platform: string } }>(
        '/push-token/:platform',
        {
            onRequest: [app.authenticate],
            schema: {
                summary:  'Deregister FCM push token',
                tags:     ['Notifications'],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request, reply) => {
            const platform = request.params.platform as 'ios' | 'android' | 'web';
            const userId   = (request.user as any).sub;

            await notificationService.deleteFcmToken(userId, platform);
            return reply.code(200).send({ success: true });
        }
    )
}