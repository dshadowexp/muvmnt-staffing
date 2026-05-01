"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/get-session";
import { createAdminClient } from "@/supabase/server";
import { s3Api } from "@/services/s3/api";
import {
  complianceItemSchema,
  type ComplianceFormValues,
} from "@/features/profile/schemas/compliance";

const COMPLIANCE_PATHS = [
  "/staff/compliance",
  "/onboarding/compliance",
] as const;

function revalidateCompliancePaths() {
  for (const p of COMPLIANCE_PATHS) revalidatePath(p);
}

/**
 * Upsert a compliance row (unique by user + name). If a row already exists for
 * the same name, the old file is deleted from storage and replaced by the new
 * one. Verification status is reset to `false` whenever the document changes
 * so an admin can re-review.
 */
export async function saveComplianceAction(data: ComplianceFormValues) {
  const parsed = complianceItemSchema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      error: true as const,
      message: first?.message ?? "Invalid compliance data",
    };
  }

  const session = await getSession();
  if (!session) {
    return { error: true as const, message: "Not authenticated" };
  }

  const { userId } = session;
  const { name, file_url: fileUrl } = parsed.data;
  const supabase = await createAdminClient();

  const { data: existing, error: lookupErr } = await supabase
    .from("compliances")
    .select("id, file_url")
    .eq("user_id", userId)
    .eq("name", name)
    .maybeSingle();

  if (lookupErr) {
    return { error: true as const, message: lookupErr.message };
  }

  if (existing) {
    if (existing.file_url && existing.file_url !== fileUrl) {
      try {
        await s3Api.delete(existing.file_url);
      } catch {
        // Best-effort cleanup; the new file is what matters.
      }
    }
    const { error } = await supabase
      .from("compliances")
      .update({
        file_url: fileUrl,
        is_verified: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) return { error: true as const, message: error.message };
  } else {
    const { error } = await supabase.from("compliances").insert({
      user_id: userId,
      name,
      file_url: fileUrl,
      is_verified: false,
    });
    if (error) return { error: true as const, message: error.message };
  }

  revalidateCompliancePaths();
  return { error: false as const, message: "Compliance document saved" };
}

/** Delete a compliance document (row + underlying file). */
export async function deleteComplianceAction(complianceId: string) {
  const session = await getSession();
  if (!session) {
    return { error: true as const, message: "Not authenticated" };
  }

  const { userId } = session;
  const supabase = await createAdminClient();

  const { data: row, error: lookupErr } = await supabase
    .from("compliances")
    .select("id, file_url")
    .eq("id", complianceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (lookupErr) {
    return { error: true as const, message: lookupErr.message };
  }
  if (!row) {
    return { error: true as const, message: "Compliance not found" };
  }

  if (row.file_url) {
    try {
      await s3Api.delete(row.file_url);
    } catch {
      // Best-effort; still remove the DB row.
    }
  }

  const { error } = await supabase
    .from("compliances")
    .delete()
    .eq("id", row.id)
    .eq("user_id", userId);

  if (error) return { error: true as const, message: error.message };

  revalidateCompliancePaths();
  return { error: false as const, message: "Compliance removed" };
}
