import type { ShiftWithStaffRequestAndWorker } from "@/features/shifts/dal/queries";

/** Table row; `workers_photo_src` is optional presigned/public URL for the worker headshot. */
export type ShiftTableRow = ShiftWithStaffRequestAndWorker & {
  workers_photo_src?: string | null;
};
