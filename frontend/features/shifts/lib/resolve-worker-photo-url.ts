"use server";

import type { ShiftWithStaffRequestAndWorker } from "@/features/shifts/dal/queries";
import type { ShiftTableRow } from "@/features/shifts/types/shift-table-row";
import { getPresignedDownloadUrl } from "@/features/storage/dal/queries";

/** S3 object key or absolute URL → value suitable for `<img src>` / `AvatarImage src`. */
export async function resolveWorkerPhotoSrc(
  photoKeyOrUrl: string | null | undefined,
): Promise<string | null> {
  if (photoKeyOrUrl == null || photoKeyOrUrl === "") return null;
  if (/^https?:\/\//i.test(photoKeyOrUrl)) return photoKeyOrUrl;
  try {
    const { url } = await getPresignedDownloadUrl(photoKeyOrUrl);
    return url ?? null;
  } catch {
    return null;
  }
}

export type ShiftWithResolvedWorkerPhoto = ShiftTableRow & {
  workers_photo_src: string | null;
};

/** Dedupes S3 keys and attaches `workers_photo_src` for each row (http(s) URLs copied through). */
export async function attachResolvedWorkerPhotos(
  rows: ShiftWithStaffRequestAndWorker[],
): Promise<ShiftWithResolvedWorkerPhoto[]> {
  const s3Keys = new Set<string>();
  for (const r of rows) {
    const raw = r.workers?.photo_url;
    if (raw != null && raw !== "" && !/^https?:\/\//i.test(raw)) {
      s3Keys.add(raw);
    }
  }
  const resolvedByKey = new Map<string, string | null>();
  await Promise.all(
    [...s3Keys].map(async (key) => {
      resolvedByKey.set(key, await resolveWorkerPhotoSrc(key));
    }),
  );

  return rows.map((r) => {
    const raw = r.workers?.photo_url ?? null;
    let workers_photo_src: string | null = null;
    if (raw != null && raw !== "") {
      workers_photo_src = /^https?:\/\//i.test(raw)
        ? raw
        : (resolvedByKey.get(raw) ?? null);
    }
    return { ...r, workers_photo_src };
  });
}
