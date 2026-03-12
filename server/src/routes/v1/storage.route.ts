import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { StorageService } from '../../services/storage/storage.service'
import {
  PresignedUploadBody,
  PresignedUploadBodyType,
  PresignedDownloadBody,
  PresignedDownloadBodyType,
  DeleteBody,
  DeleteBodyType,
  ListFilesQuery,
  ListFilesQueryType,
} from '../../schemas/storage.schema'

export default async function storageRoutes(app: FastifyInstance): Promise<void> {
    const storage = new StorageService();

    // ─── POST /storage/presign/upload ─────────────────────────────────────────
    // Returns a short-lived signed URL — client uploads directly to S3.
    // Preferred for large files; bypasses the server entirely.

    app.post<{ Body: PresignedUploadBodyType }>(
        '/presign-upload',
        {
            onRequest: [app.authenticate],
            schema: {
                summary:  'Get a presigned S3 upload URL',
                tags:     ['Storage'],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request, reply) => {
            const ownerId = request.user.sub;
            const body   = PresignedUploadBody.parse(request.body);
            const result = await storage.presignedUploadUrl({ ...body, ownerId });
            return reply.code(200).send(result);
        }
    )

    // ─── POST /storage/presign/download ───────────────────────────────────────
    // Returns a short-lived signed URL for downloading a private file.

    app.post<{ Body: PresignedDownloadBodyType }>(
        '/presign-download',
        {
            onRequest: [app.authenticate],
            schema: {
                summary:  'Get a presigned S3 download URL',
                tags:     ['Storage'],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request, reply) => {
            const { key, expiresIn } = PresignedDownloadBody.parse(request.body);
            const result = await storage.presignedDownloadUrl({ key, expiresIn });
            return reply.code(200).send(result);
        }
    )

    // ─── DELETE /storage ──────────────────────────────────────────────────────

    app.delete<{ Body: DeleteBodyType }>(
        '/',
        {
            onRequest: [app.authenticate],
            schema: {
                summary:  'Delete a file',
                tags:     ['Storage'],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request, reply) => {
            const { key } = DeleteBody.parse(request.body);

            const exists = await storage.getMetadata(key);
            if (!exists) {
                return reply.code(404).send({ statusCode: 404, error: 'Not Found', message: 'File not found' });
            }

            await storage.delete(key)
            return reply.code(200).send({ success: true });
        }
    )

    // ─── GET /storage/files ───────────────────────────────────────────────────

    app.get<{ Querystring: ListFilesQueryType }>(
        '/files',
        {
        onRequest: [app.authenticate],
        schema: {
            summary:  'List files for an owner in a folder',
            tags:     ['Storage'],
            security: [{ bearerAuth: [] }],
        },
        },
        async (request, reply) => {
            const { folder, ownerId } = ListFilesQuery.parse(request.query);
            const files = await storage.listFiles(folder, ownerId);

            return reply.code(200).send(
                files.map((f) => ({
                    ...f,
                    lastModified: f.lastModified.toISOString(),
                }))
            );
        }
    );
}