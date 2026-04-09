"use server";

import { createAdminClient } from "@/services/supabase/server";
import { s3Api } from "@/services/s3/api";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "./dal/queries";

const ADMIN_PATHS = ["/admin", "/admin/workers"] as const;

function revalidateAdminWorkerPaths(workerId: string) {
  for (const p of ADMIN_PATHS) {
    revalidatePath(p);
  }
  revalidatePath(`/admin/workers/${workerId}`);
}

export async function updateAdminWorkerStatus(
  workerId: string,
  status: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireAdminSession();
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("workers")
    .update({ status: status.trim() || null })
    .eq("id", workerId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidateAdminWorkerPaths(workerId);
  return { ok: true };
}

export async function updateAdminUserAccountActive(
  userId: string,
  workerId: string,
  isActive: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireAdminSession();
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("users")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidateAdminWorkerPaths(workerId);
  return { ok: true };
}

export async function verifyAdminCertification(
  certificationId: number,
  workerId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireAdminSession();
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("certifications")
    .update({
      is_verified: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", certificationId);

  if (error) return { ok: false, message: error.message };

  revalidateAdminWorkerPaths(workerId);
  return { ok: true };
}

export async function verifyAdminWorkAuthorization(
  authorizationId: number,
  workerId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireAdminSession();
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("work_authorizations")
    .update({
      is_verified: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", authorizationId);

  if (error) return { ok: false, message: error.message };

  revalidateAdminWorkerPaths(workerId);
  return { ok: true };
}

/** Resolve an S3 object key to a short-lived GET URL, or pass through an existing http(s) URL. */
export async function getAdminPresignedDownloadUrl(
  keyOrUrl: string,
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  await requireAdminSession();
  const trimmed = keyOrUrl.trim();
  if (!trimmed) {
    return { ok: false, message: "Missing file reference" };
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return { ok: true, url: trimmed };
  }
  try {
    const { url } = await s3Api.presignedDownloadUrl({
      key: trimmed,
      expiresIn: 3600,
    });
    return { ok: true, url };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Could not create download link";
    return { ok: false, message };
  }
}
