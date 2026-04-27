import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@/data/env/server";

export const s3Client = new S3Client({
    region: env.AWS_REGION,
    credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
    // Opt out of SDK v3 defaults that inject checksum parameters into presigned
    // URLs. Both cause Tigris to reject or mishandle byte-range requests that
    // browsers make when streaming video:
    //   responseChecksumValidation — removes x-amz-checksum-mode=ENABLED
    //   requestChecksumCalculation — removes x-amz-checksum-crc32=AAAAAA==
    responseChecksumValidation: "WHEN_REQUIRED",
    requestChecksumCalculation: "WHEN_REQUIRED",
    ...(env.AWS_ENDPOINT_URL_S3 && { endpoint: env.AWS_ENDPOINT_URL_S3, forcePathStyle: true }),
});