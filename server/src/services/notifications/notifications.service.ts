import { logger } from '../../config/logger';
import { supabase } from '../../config/supabase';

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

    // ─── FCM token management ─────────────────────────────────────────────────
    async upsertFcmToken(params: {
      userId:   string
      token:    string
      platform: 'ios' | 'android' | 'web'
    }): Promise<void> {
      await supabase
        .from('users')
        .update({ push_token: params.token })
        .eq('id', params.userId)
      logger.info({ userId: params.userId, token: params.token }, 'FCM token upserted')
    }

    async deleteFcmToken(userId: string, platform: 'ios' | 'android' | 'web'): Promise<void> {
      await supabase
        .from('users')
        .update({ push_token: null })
        .eq('id', userId)
      logger.info({ userId, platform }, 'FCM token deleted')
    }
}