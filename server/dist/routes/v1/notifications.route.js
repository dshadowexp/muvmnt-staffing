"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = notificationsRoutes;
const notifications_service_1 = require("../../services/notifications/notifications.service");
const notifications_schema_1 = require("../../schemas/notifications.schema");
const notifications_queue_1 = require("../../background/notifications.queue");
async function notificationsRoutes(app) {
    const notificationService = new notifications_service_1.NotificationService();
    // ─── POST /notifications/send ─────────────────────────────────────────────
    // Enqueues a notification across one or more channels.
    app.post('/send', {
        onRequest: [app.authenticate],
        schema: {
            summary: 'Enqueue a notification',
            tags: ['Notifications'],
            security: [{ bearerAuth: [] }],
        },
    }, async (request, reply) => {
        const body = notifications_schema_1.SendNotificationBody.parse(request.body);
        const result = await (0, notifications_queue_1.getNotificationsQueue)().enqueue(body);
        return reply.code(202).send(result);
    });
    // ─── PUT /notifications/fcm-token ─────────────────────────────────────────
    // Called by the mobile app whenever the FCM token is issued or rotated.
    // userId is taken from the JWT — users can only update their own token.
    app.put('/push-token', {
        onRequest: [app.authenticate],
        schema: {
            summary: 'Register or update FCM push token',
            tags: ['Notifications'],
            security: [{ bearerAuth: [] }],
        },
    }, async (request, reply) => {
        const { token, platform } = notifications_schema_1.UpsertFcmTokenBody.parse(request.body);
        const userId = request.user.sub;
        await notificationService.upsertFcmToken({ userId, token, platform });
        return reply.code(200).send({ success: true });
    });
    // ─── DELETE /notifications/fcm-token/:platform ────────────────────────────
    // Called on logout to deregister the token so the user stops receiving push.
    app.delete('/push-token/:platform', {
        onRequest: [app.authenticate],
        schema: {
            summary: 'Deregister FCM push token',
            tags: ['Notifications'],
            security: [{ bearerAuth: [] }],
        },
    }, async (request, reply) => {
        const platform = request.params.platform;
        const userId = request.user.sub;
        await notificationService.deleteFcmToken(userId, platform);
        return reply.code(200).send({ success: true });
    });
}
//# sourceMappingURL=notifications.route.js.map