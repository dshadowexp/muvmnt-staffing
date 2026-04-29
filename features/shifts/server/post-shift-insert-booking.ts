import { tasks } from "@trigger.dev/sdk/v3";
import { enqueueNotification } from "@/features/notifications/service/enqueue";
import { createShiftResponseToken } from "@/features/shifts/lib/shift-response-token";
import {
  computeWorkerResponseWindow,
  offerWorkerDelayToTriggerDelay,
} from "@/features/shifts/lib/worker-response-window";
import {
  formatShiftAssignedEmailPayload,
  shiftAssignedEmailSubject,
} from "@/features/shifts/server/shift-assigned-email-data";
import { formatClientBookedEmailData } from "@/features/shifts/server/client-booked-email-data";
import type { InsertedWorkerShift } from "@/features/requests/server/shifts";
import type { DaySchedule } from "@/features/requests/server/matching";
import { env } from "@/data/env/server";

type InsertOk = {
  ok: true;
  inserted: number;
  workerShifts: Map<string, InsertedWorkerShift[]>;
};

/** Notify facility operator + workers and schedule offer-worker passes (call only after successful insert). */
export async function runStaffRequestBookingSideEffects(params: {
  inserted: InsertOk;
  requestId: string;
  creatorUserId: string;
  clientName: string;
  schedule: DaySchedule[];
  hourlyRate: number;
  requirements: string[];
  tasks: string[];
}): Promise<void> {
  const {
    inserted,
    requestId,
    creatorUserId,
    clientName,
    schedule,
    hourlyRate,
    requirements,
    tasks,
  } = params;

  await enqueueNotification({
    userId: creatorUserId,
    channels: [
      {
        channel: "email",
        subject: "Your request has been confirmed",
        template: "staff-request-booked",
        data: formatClientBookedEmailData({
          clientName,
          requestId,
          schedule,
          hourlyRate,
          totalShifts: inserted.inserted,
        }),
      },
      {
        channel: "push",
        template: "staff-request-booked",
        data: {
          name: clientName,
          requestId,
          link: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/requests/${requestId}`,
        },
      },
    ],
  });

  await notifyWorkersAndScheduleOffersAfterInsert(inserted, {
    requestId,
    requirements,
    tasks,
  });
}

/**
 * Worker notifications + delayed offer-worker passes after shifts are inserted from coverage.
 */
export async function notifyWorkersAndScheduleOffersAfterInsert(
  inserted: InsertOk,
  params: {
    requestId: string;
    requirements: string[];
    tasks: string[];
  },
): Promise<void> {
  const now = Date.now();
  const notifyAll: Promise<unknown>[] = [];
  const offerTriggers: Promise<unknown>[] = [];

  for (const [workerUserId, shifts] of inserted.workerShifts) {
    const earliestMs = Math.min(
      ...shifts.map((s) => new Date(s.startIso).getTime()),
    );
    const window = computeWorkerResponseWindow(now, earliestMs);

    const [acceptToken, declineToken] = await Promise.all([
      createShiftResponseToken({
        workerId: workerUserId,
        requestId: params.requestId,
        action: "accept",
      }),
      createShiftResponseToken({
        workerId: workerUserId,
        requestId: params.requestId,
        action: "decline",
      }),
    ]);

    const acceptUrl = `${env.APP_URL}/api/shifts/respond?token=${acceptToken}`;
    const declineUrl = `${env.APP_URL}/api/shifts/respond?token=${declineToken}`;

    const emailData = formatShiftAssignedEmailPayload({
      shifts,
      clientName: " ",
      requirements: params.requirements,
      tasks: params.tasks,
      acceptUrl,
      declineUrl,
      window,
    });

    notifyAll.push(
      enqueueNotification({
        userId: workerUserId,
        channels: [
          {
            channel: "email",
            subject: shiftAssignedEmailSubject(shifts.length, window),
            template: "shift-assigned",
            data: emailData,
          },
          {
            channel: "push",
            template: "shift-assigned",
            data: {
              count: shifts.length,
              link: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/shifts/requests/${params.requestId}`,
              deadline: window.deadlineFormatted,
            },
          },
        ],
      }),
    );

    for (const s of shifts) {
      const shiftWindow = computeWorkerResponseWindow(
        now,
        new Date(s.startIso).getTime(),
      );
      offerTriggers.push(
        tasks
          .trigger(
            "shifts.offer-worker",
            { shiftId: s.shiftId },
            { delay: offerWorkerDelayToTriggerDelay(shiftWindow.offerWorkerDelayMs) },
          )
          .catch(() => undefined),
      );
    }
  }

  await Promise.allSettled(notifyAll);
  await Promise.allSettled(offerTriggers);
}
