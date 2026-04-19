import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { env } from '@/data/env/server';
import { s3Client } from './client';
  
// ─── Types ────────────────────────────────────────────────────────────────────

export type StorageFolder = 'avatars' | 'compliance' | 'receipts' | 'shifts' | 'feedback' | 'resumes'

export interface UploadParams {
    folder:      StorageFolder
    ownerId:     string           // userId or entityId — scopes the key
    filename:    string
    buffer:      Buffer
    mimeType:    string
    metadata?:   Record<string, string>
}

export interface UploadResult {
    key:         string           // full S3 key
    url:         string           // permanent public URL (if bucket is public)
    size:        number
    mimeType:    string
    etag:        string
}

export interface DownloadResult {
    stream:      Readable
    mimeType:    string
    size:        number
    filename:    string
}

export interface PresignedUrlResult {
    url:         string
    expiresIn:   number           // seconds
    key:         string
}

export interface FileMetadata {
    key:         string
    size:        number
    mimeType:    string
    lastModified: Date
}

// ─── API ─────────────────────────────────────────────────────────────────────

class S3Api {
    private readonly s3:     S3Client
    private readonly bucket: string

    constructor() {
        this.bucket = env.AWS_S3_BUCKET;
        this.s3     = s3Client;
    }

    // ─── Upload ───────────────────────────────────────────────────────────────

    async upload(params: UploadParams): Promise<UploadResult> {
        const key  = this.buildKey(params.folder, params.ownerId, params.filename);
        const etag = createHash('md5').update(params.buffer).digest('hex');

        await this.s3.send(new PutObjectCommand({
            Bucket:      this.bucket,
            Key:         key,
            Body:        params.buffer,
            ContentType: params.mimeType,
            Metadata: {
                ownerId:  params.ownerId,
                filename: params.filename,
                ...params.metadata,
            },
        }));

        return {
            key,
            url:      this.buildPublicUrl(key),
            size:     params.buffer.byteLength,
            mimeType: params.mimeType,
            etag,
        };
    }

    // ─── Download (stream) ────────────────────────────────────────────────────

    async download(key: string): Promise<DownloadResult> {
        const response = await this.s3.send(new GetObjectCommand({
            Bucket: this.bucket,
            Key:    key,
        }));

        if (!response.Body) throw new Error(`Empty response body for key: ${key}`);

        return {
            stream:   response.Body as Readable,
            mimeType: response.ContentType  ?? 'application/octet-stream',
            size:     response.ContentLength ?? 0,
            filename: response.Metadata?.['filename'] ?? key.split('/').pop() ?? key,
        };
    }

    // ─── Delete ───────────────────────────────────────────────────────────────

    async delete(key: string): Promise<void> {
        await this.s3.send(new DeleteObjectCommand({
            Bucket: this.bucket,
            Key:    key,
        }));
    }

    // ─── Presigned upload URL (client uploads directly to S3) ─────────────────

    async presignedUploadUrl(params: {
        context:   StorageFolder
        ownerId:   string
        filename:  string
        contentType:  string
    }): Promise<PresignedUrlResult> {
        const key       = this.buildKey(params.context, params.ownerId, params.filename)
        const expiresIn = 300;

        const command = new PutObjectCommand({
            Bucket:      this.bucket,
            Key:         key,
            ContentType: params.contentType,
            Metadata: {
                ownerId:  params.ownerId,
                filename: params.filename,
            },
        });

        const url = await getSignedUrl(
            this.s3,
            command,
            { expiresIn }
        )

        return { url, expiresIn, key };
    }

    // ─── Presigned download URL (time-limited access to private files) ─────────

    async presignedDownloadUrl(params: {
        key:        string
        expiresIn?: number          // seconds, default 3600
    }): Promise<PresignedUrlResult> {
        const expiresIn = params.expiresIn ?? 3600

        const url = await getSignedUrl(
            this.s3,
            new GetObjectCommand({ Bucket: this.bucket, Key: params.key }),
            { expiresIn }
        );

        return { url, expiresIn, key: params.key };
    }

    // ─── File metadata (existence check + size) ───────────────────────────────

    async getMetadata(key: string): Promise<FileMetadata | null> {
        try {
            const response = await this.s3.send(new HeadObjectCommand({
                Bucket: this.bucket,
                Key:    key,
            }));

            return {
                key,
                size:         response.ContentLength ?? 0,
                mimeType:     response.ContentType   ?? 'application/octet-stream',
                lastModified: response.LastModified  ?? new Date(),
            };
        } catch (err: any) {
            if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) return null;
            throw err;
        }
    }

    // ─── List files for an owner within a folder ──────────────────────────────

    async listFiles(folder: StorageFolder, ownerId: string): Promise<FileMetadata[]> {
        const prefix   = `${folder}/${ownerId}/`
        const response = await this.s3.send(new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: prefix,
        }))

        return (response.Contents ?? []).map((obj) => ({
            key:          obj.Key          ?? '',
            size:         obj.Size         ?? 0,
            mimeType:     'application/octet-stream', // HEAD each file for exact type if needed
            lastModified: obj.LastModified ?? new Date(),
        }))
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    // Key structure: {folder}/{ownerId}/{timestamp}-{sanitisedFilename}
    // e.g. documents/usr_123/1710000000000-contract.pdf
    private buildKey(folder: StorageFolder, ownerId: string, filename: string): string {
        const sanitised = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        return `${folder}/${ownerId}/${Date.now()}-${sanitised}`;
    }

    private buildPublicUrl(key: string): string {
        if (env.AWS_ENDPOINT_URL_S3) {
            return `${env.AWS_ENDPOINT_URL_S3}/${this.bucket}/${key}`;
        }
        return `https://${this.bucket}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
    }
}

export const s3Api = new S3Api();