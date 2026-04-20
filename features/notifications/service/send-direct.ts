import "server-only";

import { EmailChannel } from "../channels/email.channel";

/**
 * Send a transactional email directly to an arbitrary address — i.e. without
 * the recipient needing a `users` row first. Used for invitations and other
 * "anonymous" sends where {@link enqueueNotification} (which keys on
 * `userId`) does not apply.
 *
 * Notes:
 *  - Synchronous send (no Trigger.dev queue / retries / delayMs). Callers
 *    that need durable retries should still go through `enqueueNotification`.
 *  - Failures are surfaced to the caller — wrap in try/catch and log.
 */

let cachedChannel: EmailChannel | null = null;
function getEmailChannel(): EmailChannel {
  if (!cachedChannel) cachedChannel = new EmailChannel();
  return cachedChannel;
}

export type SendDirectEmailInput = {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
};

export type SendDirectEmailResult =
  | { status: "sent" }
  | { status: "failed"; error: string };

export async function sendDirectEmail(
  input: SendDirectEmailInput,
): Promise<SendDirectEmailResult> {
  try {
    await getEmailChannel().send(input);
    return { status: "sent" };
  } catch (err) {
    return {
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
