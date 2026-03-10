import { logger } from '../../config/logger';
import { NotificationRepository } from './notifications.repository';
import { EmailChannel } from './channels/email.channel';
import { SmsChannel } from './channels/sms.channel';
import { PushChannel } from './channels/push.channel';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationChannel = 'email' | 'sms' | 'push'

export interface SendNotificationParams {
  userId:          string
  channels:        NotificationChannel | NotificationChannel[]
  subject?:        string
  template:        string
  data:            Record<string, unknown>
  delay?:          number   // ms — optional scheduling delay
  idempotencyKey?: string   // caller-supplied key; auto-derived if omitted
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class NotificationService {
  private readonly repo:  NotificationRepository
  private readonly email: EmailChannel
  private readonly sms:   SmsChannel
  private readonly push:  PushChannel

  constructor() {
    this.repo  = new NotificationRepository();
    this.email = new EmailChannel();
    this.sms   = new SmsChannel();
    this.push  = new PushChannel();
  }

    // ─── Send (blocking, called by worker only) ───────────────────────────────

    async send(params: Omit<SendNotificationParams, 'delay'> & { idempotencyKey: string }): Promise<void> {
        const { idempotencyKey, userId, subject, template, data } = params
        const channels = Array.isArray(params.channels) ? params.channels : [params.channels]

        // Durable idempotency check — guards against duplicate delivery if the
        // worker retries after a crash mid-send
        const alreadySent = await this.repo.hasBeenSent(idempotencyKey);
        if (alreadySent) {
            logger.info({ idempotencyKey }, 'Notification send skipped — already recorded');
            return;
        }

        const user = await this.repo.findUserById(userId)
        if (!user) throw new Error(`User ${userId} not found`)

        const results = await Promise.allSettled(
            channels.map((ch) => {
                switch (ch) {
                case 'email':
                    return this.email.send({ to: user.email, subject: subject ?? template, template, data })
                case 'sms':
                    return this.sms.send({ to: user.phone, template, data })
                case 'push':
                    return this.push.send({ userId: user.id, template, data })
                }
            })
        )

        results.forEach((result, i) => {
            if (result.status === 'rejected') {
                logger.error(
                  { channel: channels[i], userId, template, err: result.reason },
                  'Channel delivery failed'
                )
            }
        })

        // Persist with idempotency key — unique constraint ensures exactly-once recording
        await this.repo.createNotification({ idempotencyKey, userId, channels, template, data })
    }

    // ─── FCM token management ─────────────────────────────────────────────────

    async upsertFcmToken(params: {
      userId:   string
      token:    string
      platform: 'ios' | 'android' | 'web'
    }): Promise<void> {
      await this.repo.upsertFcmToken(params)
      logger.info({ userId: params.userId, platform: params.platform }, 'FCM token upserted')
    }

    async deleteFcmToken(userId: string, platform: 'ios' | 'android' | 'web'): Promise<void> {
      await this.repo.deleteFcmToken(userId, platform)
      logger.info({ userId, platform }, 'FCM token deleted')
    }
}