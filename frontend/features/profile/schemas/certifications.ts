import { z } from "zod";
import { CERTIFICATION_NAMES } from "@/lib/constants";

const certificationItemSchema = z.object({
  name: z
    .string()
    .min(1, "Certification name is required")
    .refine(
      (val) => CERTIFICATION_NAMES.includes(val as (typeof CERTIFICATION_NAMES)[number]),
      "Invalid certification"
    ),
  file_url: z.string().min(1, "Please upload the certification document"),
});

export const certificationsSchema = z.object({
  certifications: z
    .array(certificationItemSchema)
    .min(0)
    .refine(
      (items) => {
        const names = items.map((i) => i.name);
        return new Set(names).size === names.length;
      },
      { message: "Duplicate certifications are not allowed" }
    ),
});

export type CertificationsFormValues = z.infer<typeof certificationsSchema>;
export type CertificationItem = z.infer<typeof certificationItemSchema>;
