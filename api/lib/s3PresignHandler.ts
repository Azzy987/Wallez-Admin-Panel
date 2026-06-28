import { createHmac, createHash } from 'crypto';

export interface S3PresignRequestBody {
  dir?: string;
  filename?: string;
  contentType?: string;
}

export interface S3PresignResult {
  status: number;
  body: Record<string, unknown>;
}

function sha256(message: string): string {
  return createHash('sha256').update(message).digest('hex');
}

function hmacSha256(key: Buffer | string, message: string): Buffer {
  return createHmac('sha256', key).update(message).digest();
}

function getSigningKey(secretAccessKey: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

function createPresignedUrl(
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
  bucket: string,
  key: string,
  contentType: string,
  expiresIn: number = 300
): string {
  const algorithm = 'AWS4-HMAC-SHA256';
  const service = 's3';
  const host = `${bucket}.s3.${region}.amazonaws.com`;

  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': algorithm,
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': 'host',
  });

  const canonicalRequest = [
    'PUT',
    `/${key}`,
    queryParams.toString(),
    `host:${host}`,
    '',
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');

  const signingKey = getSigningKey(secretAccessKey, dateStamp, region, service);
  const signature = hmacSha256(signingKey, stringToSign).toString('hex');
  queryParams.set('X-Amz-Signature', signature);

  return `https://${host}/${key}?${queryParams.toString()}`;
}

function checkFileExists(
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
  bucket: string,
  key: string
): Promise<boolean> {
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const url = `https://${host}/${key}`;

  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;

  const canonicalRequest = [
    'HEAD',
    `/${key}`,
    '',
    `host:${host}`,
    '',
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');

  const signingKey = getSigningKey(secretAccessKey, dateStamp, region, 's3');
  const signature = hmacSha256(signingKey, stringToSign).toString('hex');
  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=host, Signature=${signature}`;

  return fetch(url, {
    method: 'HEAD',
    headers: {
      Host: host,
      Authorization: authHeader,
      'X-Amz-Date': amzDate,
    },
  })
    .then((res) => res.status === 200)
    .catch(() => false);
}

export async function handleS3PresignUpload(body: S3PresignRequestBody): Promise<S3PresignResult> {
  const { dir = 'wallez', filename, contentType = 'application/octet-stream' } = body;

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_S3_REGION;
  const bucket = process.env.AWS_S3_BUCKET;
  const cloudfront = process.env.CLOUDFRONT_DOMAIN;
  const pattern = process.env.IMAGE_TRANSFORM_PATTERN || '/fit-in/{w}x{h}/';

  if (!accessKeyId) return { status: 500, body: { error: 'AWS_ACCESS_KEY_ID is missing' } };
  if (!secretAccessKey) return { status: 500, body: { error: 'AWS_SECRET_ACCESS_KEY is missing' } };
  if (!region) return { status: 500, body: { error: 'AWS_S3_REGION is missing' } };
  if (!bucket) return { status: 500, body: { error: 'AWS_S3_BUCKET is missing' } };
  if (!cloudfront) return { status: 500, body: { error: 'CLOUDFRONT_DOMAIN is missing' } };
  if (!filename) return { status: 500, body: { error: 'filename is missing' } };

  const cleanDir = String(dir).replace(/^\/+|\/+$/g, '');
  const cleanFilename = filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

  const hasExtension = cleanFilename.includes('.');
  const extFromType =
    contentType === 'image/png'
      ? '.png'
      : contentType === 'image/webp'
        ? '.webp'
        : contentType === 'image/jpeg' || contentType === 'image/jpg'
          ? '.jpg'
          : '';

  const finalFilename = hasExtension ? cleanFilename : `${cleanFilename}${extFromType || '.jpg'}`;
  const key = `${cleanDir}/${finalFilename}`;

  const fileExists = await checkFileExists(accessKeyId, secretAccessKey, region, bucket, key);

  if (fileExists) {
    return {
      status: 200,
      body: {
        fileExists: true,
        key,
        publicUrl: `https://${cloudfront}/${key}`,
        thumbnailTemplate: `https://${cloudfront}${pattern}${key}`,
        message: 'File already exists, skipping upload',
      },
    };
  }

  const uploadUrl = createPresignedUrl(
    accessKeyId,
    secretAccessKey,
    region,
    bucket,
    key,
    contentType,
    300
  );

  return {
    status: 200,
    body: {
      uploadUrl,
      key,
      publicUrl: `https://${cloudfront}/${key}`,
      thumbnailTemplate: `https://${cloudfront}${pattern}${key}`,
      s3DirectUrl: `https://${bucket}.s3.${region}.amazonaws.com/${key}`,
    },
  };
}
