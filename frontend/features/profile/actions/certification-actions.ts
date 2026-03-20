"use server";

import { getSession } from "@/lib/session";
import { createAdminClient } from "@/services/supabase/server";
import { certificationsSchema, type CertificationsFormValues } from "@/features/profile/schemas/certifications";

export async function saveCertificationAction(name: string, fileUrl: string) {
  const session = await getSession();
  if (!session) {
    return { error: true, message: "Not authenticated" };
  }

  const { userId } = session;
  const supabase = await createAdminClient();

  const { data: existing } = await supabase
    .from("certifications")
    .select("id")
    .eq("user_id", userId)
    .eq("name", name)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("certifications")
      .update({ file_url: fileUrl, updated_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (error) {
      return { error: true, message: error.message };
    }
  } else {
    const { error } = await supabase.from("certifications").insert({
      user_id: userId,
      name,
      file_url: fileUrl,
      is_verified: false,
    });

    if (error) {
      return { error: true, message: error.message };
    }
  }

  return { error: false, message: "Certification saved successfully" };
}

export async function deleteCertificationAction(name: string) {
  const session = await getSession();
  if (!session) {
    return { error: true, message: "Not authenticated" };
  }

  const { userId } = session;
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("certifications")
    .delete()
    .eq("user_id", userId)
    .eq("name", name);

  if (error) {
    return { error: true, message: error.message };
  }

  return { error: false, message: "Certification removed" };
}

export async function saveCertificationsAction(data: CertificationsFormValues) {
  const parsed = certificationsSchema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      error: true,
      message: first?.message ?? "Invalid certification data",
    };
  }

  const session = await getSession();
  if (!session) {
    return { error: true, message: "Not authenticated" };
  }

  const { userId } = session;
  const supabase = await createAdminClient();

  const { error: deleteError } = await supabase
    .from("certifications")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    return { error: true, message: deleteError.message };
  }

  const { certifications } = parsed.data;
  if (certifications.length === 0) {
    return { error: false, message: "Certifications saved successfully" };
  }

  const { error: insertError } = await supabase.from("certifications").insert(
    certifications.map((c) => ({
      user_id: userId,
      name: c.name,
      file_url: c.file_url,
      is_verified: false,
    }))
  );

  if (insertError) {
    return { error: true, message: insertError.message };
  }

  return { error: false, message: "Certifications saved successfully" };
}
