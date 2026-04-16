import { logger } from '../../config/logger';
import { config } from '../../config/env';
import { getSendNotificationsQueue } from '../../background/send-notifications.queue';

function clientFirstNameFromDisplayName(displayName: string): string {
  const t = displayName.trim();
  if (!t) return 'there';
  const first = t.split(/\s+/)[0] ?? t;
  return first || 'there';
}

function formatScheduleLine(startYmd: string, endYmd: string | null): string {
  const start = new Date(`${startYmd}T12:00:00Z`);
  const end = endYmd ? new Date(`${endYmd}T12:00:00Z`) : null;
  const dOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  const startStr = Number.isNaN(start.getTime()) ? startYmd : start.toLocaleDateString('en-US', dOpts);
  if (!end || Number.isNaN(end.getTime()) || endYmd === startYmd) {
    return startStr;
  }
  const endStr = end.toLocaleDateString('en-US', dOpts);
  return `${startStr} – ${endStr}`;
}

/**
 * Minimal confirmation email to the client after payment and shifts are created.
 */
export async function enqueueStaffRequestBookedEmail(params: {
  clientUserId: string;
  requestId: string;
  clientDisplayName: string;
  amountCents: number;
  shiftCount: number;
  startDateYmd: string;
  endDateYmd: string | null;
}): Promise<void> {
  const baseWeb = config.webAppUrl.replace(/\/$/, '');
  const privacyUrl = `${baseWeb}/privacy`;
  const unsubscribeUrl = `${baseWeb}/settings`;
  const requestUrl = `${baseWeb}/client/requests/${encodeURIComponent(params.requestId)}`;

  const amountLine = new Intl.NumberFormat('en-CA', {
    style:    'currency',
    currency: 'CAD',
  }).format(params.amountCents / 100);

  const shiftsLine =
    params.shiftCount === 1 ? '1 shift' : `${params.shiftCount} shifts`;

  const scheduleLine = formatScheduleLine(params.startDateYmd, params.endDateYmd);

  try {
    await getSendNotificationsQueue().enqueue({
      idempotencyKey: `staff-request-booked-email-${params.requestId}`,
      userId:         params.clientUserId,
      channels:       ['email'],
      subject:        'Staff request confirmed',
      template:       'staff-request-booked',
      data: {
        previewText:     'Staff request confirmed',
        clientFirstName:   clientFirstNameFromDisplayName(params.clientDisplayName),
        scheduleLine,
        shiftsLine,
        amountLine,
        requestId:         params.requestId,
        requestUrl,
        privacyUrl,
        unsubscribeUrl,
      },
    });
  } catch (e) {
    logger.error(
      { err: e, requestId: params.requestId, userId: params.clientUserId },
      'staff-request-booked-email: enqueue failed',
    );
  }
}
