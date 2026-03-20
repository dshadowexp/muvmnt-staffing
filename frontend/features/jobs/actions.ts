import { z } from "zod";
import { jobFormSchema } from "./schema";
import { createJobInfo, updateJobInfo } from "./dal/mutations";

export async function createJobInfoAction(unsafeData: z.infer<typeof jobFormSchema>) {
    const { success, data } = jobFormSchema.safeParse(unsafeData);
    if (!success) {
        return { error: true, message: "Invalid job data" };
    }

    const { error, message } = await createJobInfo(data);
    if (error) {
        return { error: true, message: message };
    }

    return { error: false, message: message, data: data };
}

export async function updateJobInfoAction(id: string,unsafeData: z.infer<typeof jobFormSchema>) {
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