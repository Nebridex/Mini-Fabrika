import { createReadStream } from 'node:fs';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { config } from './config.js';

const client = new S3Client({
  region: config.s3.region,
  endpoint: config.s3.endpoint,
  forcePathStyle: config.s3.forcePathStyle,
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey
  }
});

export async function storePrivateFile(path, requestId, metadata) {
  const key = `requests/${requestId}/${metadata.sha256}${metadata.extension}`;
  await client.send(new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
    Body: createReadStream(path),
    ContentType: metadata.contentType,
    ContentLength: metadata.size,
    Metadata: { requestId, sha256: metadata.sha256 },
    ServerSideEncryption: process.env.S3_SERVER_SIDE_ENCRYPTION || undefined
  }));
  return key;
}

export async function getPrivateFile(key) {
  return client.send(new GetObjectCommand({ Bucket: config.s3.bucket, Key: key }));
}
