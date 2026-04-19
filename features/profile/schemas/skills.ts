import { z } from "zod";
import { SKILL_NAMES } from "@/lib/constants";

const skillItemSchema = z.object({
  name: z
    .string()
    .min(1, "Skill name is required")
    .refine(
      (val) => SKILL_NAMES.includes(val as (typeof SKILL_NAMES)[number]),
      "Invalid skill",
    ),
});

export const skillsSchema = z.object({
  skills: z
    .array(skillItemSchema)
    .min(0)
    .refine(
      (items) => {
        const names = items.map((i) => i.name);
        return new Set(names).size === names.length;
      },
      { message: "Duplicate skills are not allowed" },
    ),
});

export type SkillsFormValues = z.infer<typeof skillsSchema>;
export type SkillItem = z.infer<typeof skillItemSchema>;
