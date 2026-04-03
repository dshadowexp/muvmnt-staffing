import { z } from "zod";
import {
  jobFormSchema,
  staffRequestCreateSchema,
  type StaffRequestCreateValues,
} from "./schema";
import {
  acceptStaffRequestHourlyRate,
  createJobInfo,
  updateJobInfo,
} from "./dal/mutations";

export async function createJobInfoAction(unsafeData: unknown) {
  const { success, data } = staffRequestCreateSchema.safeParse(unsafeData);
  if (!success) {
    return { error: true, message: "Invalid job data" };
  }

  const { error, message } = await createJobInfo(data as StaffRequestCreateValues);
  if (error) {
    return { error: true, message: message };
  }

  return { error: false, message: message, data: data };
}

export async function updateJobInfoAction(id: string, unsafeData: unknown) {
  const { success, data } = jobFormSchema.safeParse(unsafeData);
  if (!success) {
    return { error: true, message: "Invalid job data" };
  }

  const { error, message } = await updateJobInfo(id, data);
  if (error) {
    return { error: true, message: message };
  }

  return { error: false, message: message, data: data };
}

const acceptRateSchema = z.coerce.number().min(15, "Minimum hourly rate is $15");

export async function acceptStaffRequestHourlyRateAction(
  jobId: string,
  unsafeHourlyRate: unknown,
) {
  const parsed = acceptRateSchema.safeParse(unsafeHourlyRate);
  if (!parsed.success) {
    return { error: true, message: parsed.error.issues[0]?.message ?? "Invalid rate" };
  }

  return acceptStaffRequestHourlyRate(jobId, parsed.data);
}
