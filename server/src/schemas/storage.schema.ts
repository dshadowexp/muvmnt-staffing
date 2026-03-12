import { z } from 'zod'

// ─── Shared ───────────────────────────────────────────────────────────────────

const StorageFolder = z.enum(['certifications', 'avatars', 'compliance', 'receipts', 'shifts']);

// ─── Upload (multipart) ───────────────────────────────────────────────────────

export const UploadQuery = z.object({
    folder:  StorageFolder,
    ownerId: z.string().uuid('Invalid owner ID'),
});

export const UploadReply = z.object({
    key:      z.string(),
    url:      z.string(),
    size:     z.number().int(),
    mimeType: z.string(),
    etag:     z.string(),
});

// ─── Presigned upload URL ─────────────────────────────────────────────────────

export const PresignedUploadBody = z.object({
    context:    StorageFolder,
    filename:  z.string().min(1),
    contentType:  z.string().min(1),
});

export const PresignedUrlReply = z.object({
    url:       z.string().url(),
    expiresIn: z.number().int(),
    key:       z.string(),
});

// ─── Presigned download URL ───────────────────────────────────────────────────

export const PresignedDownloadBody = z.object({
  key:       z.string().min(1),
  expiresIn: z.number().int().positive().max(86400).optional(),
})

// ─── Delete ───────────────────────────────────────────────────────────────────

export const DeleteBody = z.object({
    key: z.string().min(1, 'File key is required'),
});

export const DeleteReply = z.object({
    success: z.boolean(),
});

// ─── List files ───────────────────────────────────────────────────────────────

export const ListFilesQuery = z.object({
    folder:  StorageFolder,
    ownerId: z.string().uuid(),
});

export const FileMetadataReply = z.object({
    key:          z.string(),
    size:         z.number().int(),
    mimeType:     z.string(),
    lastModified: z.string().datetime(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type UploadQueryType         = z.infer<typeof UploadQuery>
export type UploadReplyType         = z.infer<typeof UploadReply>
export type PresignedUploadBodyType = z.infer<typeof PresignedUploadBody>
export type PresignedUrlReplyType   = z.infer<typeof PresignedUrlReply>
export type PresignedDownloadBodyType = z.infer<typeof PresignedDownloadBody>
export type DeleteBodyType          = z.infer<typeof DeleteBody>
export type ListFilesQueryType      = z.infer<typeof ListFilesQuery>