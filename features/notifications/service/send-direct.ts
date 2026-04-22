import "server-only";

import { EmailChannel } from "../channels/email.channel";
import { PushChannel } from "../channels/push.channel";

/**
 * Direct sends (no Trigger.dev queue / `userId` lookup). Use
 * {@link enqueueNotification} when the recipient is a known user and you
 * want idempotent, retried delivery across channels.
 *
 * Notes:
 *  - Synchronous. Callers that need durable retries should use
 *    `enqueueNotification` (or wrap these in a Trigger task).
 *  - Failures are surfaced — wrap in try/catch and log at call sites.
 */

let cachedEmail: EmailChannel | null = null;
function getEmailChannel(): EmailChannel {
  if (!cachedEmail) cachedEmail = new EmailChannel();
  return cachedEmail;
}

let cachedPush: PushChannel | null = null;
function getPushChannel(): PushChannel {
  if (!cachedPush) cachedPush = new PushChannel();
  return cachedPush;
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

export type SendDirectPushInput = {
  token: string;
  template: string;
  data: Record<string, unknown>;
};

export type SendDirectPushResult =
  | { status: "sent"; messageId: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

export async function sendDirectPush(
  input: SendDirectPushInput,
): Promise<SendDirectPushResult> {
  const token = input.token?.trim();
  if (!token) {
    return { status: "skipped", reason: "No push token" };
  }

  try {
    const result = await getPushChannel().send({
      token,
      template: input.template,
      data: input.data,
    });

    if (!result.success || result.messageId == null) {
      return {
        status: "skipped",
        reason: "Push was not delivered (token invalid or channel declined)",
      };
    }

    return { status: "sent", messageId: result.messageId };
  } catch (err) {
    return {
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
