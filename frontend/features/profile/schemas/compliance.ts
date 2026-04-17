import { z } from "zod";
import { COMPLIANCE_NAMES } from "@/lib/constants";

export const complianceItemSchema = z.object({
  name: z
    .string()
    .min(1, "Compliance type is required")
    .refine(
      (val) => COMPLIANCE_NAMES.includes(val as (typeof COMPLIANCE_NAMES)[number]),
      "Please pick a compliance type from the list",
    ),
  file_url: z.string().min(1, "A supporting document is required"),
});

export type ComplianceFormValues = z.infer<typeof complianceItemSchema>;
