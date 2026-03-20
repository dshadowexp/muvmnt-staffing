import { z } from "zod";
import { WORK_AUTHORIZATION_TYPES } from "@/lib/constants";
import type { WorkAuthorization } from "@/types";

export const authorizationSchema = z.object({
  workAuthorization: z
    .string()
    .min(1, "Please select work authorization status")
    .refine(
      (val) => WORK_AUTHORIZATION_TYPES.includes(val as WorkAuthorization),
      "Please select a valid work authorization"
    ),
});

export type AuthorizationFormValues = z.infer<typeof authorizationSchema>;
