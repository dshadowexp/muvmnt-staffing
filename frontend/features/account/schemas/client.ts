import { Database } from "@/services/supabase/types/database";
import { z } from "zod";

export const clientSchema = z.object({
    name: z.string().min(1, "Organization name is required"),
    type: z.string().min(1, "Organization type is required"),
});

export type ClientProfileValues = z.infer<typeof clientSchema>;

type ClientProfileRow = Database["public"]["Tables"]["clients"]["Row"];

export type ClientProfileFormInput = Pick<
  ClientProfileRow,
  | "id"
  | "name"
  | "type"
>;

export function mapClientProfileToFormValues(row: ClientProfileFormInput): ClientProfileValues {
    return {
        name: row.name,
        type: row.type,
    };
}