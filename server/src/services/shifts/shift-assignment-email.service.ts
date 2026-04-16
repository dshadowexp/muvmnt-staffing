import { logger } from '../../config/logger';
import { config } from '../../config/env';
import { getSendNotificationsQueue } from '../../background/send-notifications.queue';
import { supabase } from '../../config/supabase';
import { createShiftEmailActionToken } from './shift-email-token';
import {
  addressFromLocation,
  formatShiftRateLine,
  formatShiftScheduleLine,
} from './shift-email-format';

export type InsertedShiftRow = {
  id: string;
  worker_id: string;
  start_time: string;
  end_time: string;
  hourly_rate: number | null;
  location: unknown;
};

/**
 * After shifts are inserted for a confirmed staff request, email each assigned worker
 * with Eastern-time details and signed confirm / decline links (API routes).
 */
export async function enqueueShiftAssignmentEmails(params: {
  shiftRows: InsertedShiftRow[];
  clientDisplayName: string;
}): Promise<void> {
  const { shiftRows, clientDisplayName } = params;
  if (shiftRows.length === 0) return;

  const workerIds = [...new Set(shiftRows.map(r => r.worker_id))];
  const { data: workers, error: wErr } = await supabase
    .from('workers')
    .select('id, user_id, first_name')
    .in('id', workerIds);

  if (wErr || !workers?.length) {
    logger.error({ err: wErr }, 'shift-assignment-email: could not load workers');
    return;
  }

  const workerById = new Map(workers.map(w => [w.id, w]));
  const baseApi = config.appUrl.replace(/\/$/, '');
  const privacyUrl = `${config.webAppUrl.replace(/\/$/, '')}/privacy`;
  const unsubscribeUrl = `${config.webAppUrl.replace(/\/$/, '')}/settings`;

  for (const row of shiftRows) {
    const w = workerById.get(row.worker_id);
    if (!w?.user_id) continue;

    const confirmToken = createShiftEmailActionToken(row.id, w.user_id, 'confirm');
    const declineToken = createShiftEmailActionToken(row.id, w.user_id, 'decline');
    const confirmUrl = `${baseApi}/v1/shifts/email/confirm?token=${encodeURIComponent(confirmToken)}`;
    const declineUrl = `${baseApi}/v1/shifts/email/decline?token=${encodeURIComponent(declineToken)}`;

    const whenLine = formatShiftScheduleLine(row.start_time, row.end_time);
    const address = addressFromLocation(row.location);
    const rateLine = formatShiftRateLine(row.hourly_rate);

    try {
      await getSendNotificationsQueue().enqueue({
        idempotencyKey: `shift-assigned-email-${row.id}`,
        userId:         w.user_id,
        channels:       ['email'],
        subject:        'New shift assigned — confirm or decline',
        template:       'shift-assigned',
        data: {
          previewText: 'New shift assigned',
          workerFirstName: (w.first_name ?? '').trim() || 'there',
          clientName:      clientDisplayName,
          whenLine,
          address,
          rateLine,
          confirmUrl,
          declineUrl,
          privacyUrl,
          unsubscribeUrl,
        },
      });
    } catch (e) {
      logger.error({ err: e, shiftId: row.id, userId: w.user_id }, 'shift-assignment-email: enqueue failed');
    }
  }
}
