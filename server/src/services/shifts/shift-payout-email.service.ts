import { logger } from '../../config/logger';
import { config } from '../../config/env';
import { getSendNotificationsQueue } from '../../background/send-notifications.queue';

export async function enqueueShiftPayoutReceivedEmail(params: {
  shiftId: string;
  workerUserId: string;
  workerFirstName: string;
  amountCents: number;
  currency: string;
  // hoursWorked: number;
  billableHours: number;
  stripeTransferId: string;
}): Promise<void> {
  const baseWeb = config.webAppUrl.replace(/\/$/, '');
  const privacyUrl = `${baseWeb}/privacy`;
  const unsubscribeUrl = `${baseWeb}/settings`;
  const shiftsUrl = `${baseWeb}/worker/shifts`;

  const currencyCode = params.currency.trim().toUpperCase() || 'CAD';
  const amountLine = new Intl.NumberFormat('en-CA', {
    style:    'currency',
    currency: currencyCode,
  }).format(params.amountCents / 100);

  const hoursLine = `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(params.billableHours)} hrs`;

  try {
    await getSendNotificationsQueue().enqueue({
      idempotencyKey: `shift-payout-email-${params.shiftId}`,
      userId:         params.workerUserId,
      channels:       ['email'],
      subject:        'Shift payment sent',
      template:       'shift-payout-received',
      data: {
        previewText:     'Shift payment sent',
        workerFirstName: params.workerFirstName.trim() || 'there',
        amountLine,
        hoursLine,
        referenceLine: params.stripeTransferId,
        shiftsUrl,
        privacyUrl,
        unsubscribeUrl,
      },
    });
  } catch (e) {
    logger.error(
      { err: e, shiftId: params.shiftId, userId: params.workerUserId },
      'shift-payout-email: enqueue failed',
    );
  }
}
