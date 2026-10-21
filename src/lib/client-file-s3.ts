import 'server-only';

import {
  DeleteObjectCommand, GetBucketCorsCommand, GetObjectCommand,
  HeadObjectCommand, PutBucketCorsCommand, S3Client, type CORSRule,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { awsCredentialsProvider } from '@vercel/oidc-aws-credentials-provider';

export const MAX_CLIENT_FILE_BYTES = 100 * 1024 * 1024;
let client: S3Client | undefined;
let corsPromise: Promise<void> | undefined;

export function getS3BucketName() {
  const bucket = process.env.S3_BUCKET_NAME?.trim();
  if (!bucket) throw new Error('إعداد Amazon S3 غير مكتمل: S3_BUCKET_NAME غير موجود.');
  return bucket;
}

export function getS3Client() {
  const region = process.env.AWS_REGION?.trim();
  const roleArn = process.env.AWS_ROLE_ARN?.trim();
  if (!region || !roleArn) throw new Error('اربط تكامل Amazon S3 بمشروع Vercel في بيئة Production.');
  if (!client) client = new S3Client({ region, credentials: awsCredentialsProvider({ roleArn }) });
  return client;
}

export function makePrivateS3Url(key: string) {
  return 's3://' + getS3BucketName() + '/' + key;
}

export function parsePrivateS3Url(value: string | null | undefined, clientId?: string) {
  const bucket = process.env.S3_BUCKET_NAME?.trim();
  if (!value || !bucket || !value.startsWith('s3://' + bucket + '/')) return null;
  const key = value.slice(('s3://' + bucket + '/').length);
  if (!key || key.includes('\\') || key.includes('?') || key.includes('#') ||
      key.split('/').some((part) => !part || part === '.' || part === '..') ||
      (clientId && !key.startsWith('clients/' + clientId + '/'))) return null;
  return { bucket, key };
}

function appOrigin() {
  const value = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://dr-hossam-lotfy-hw88.vercel.app';
  try { return new URL(value).origin; } catch { return 'https://dr-hossam-lotfy-hw88.vercel.app'; }
}

function allowsUpload(rule: CORSRule) {
  return !!rule.AllowedOrigins?.some((v) => v === '*' || v === appOrigin()) &&
    !!rule.AllowedMethods?.includes('POST') &&
    !!rule.AllowedHeaders?.some((v) => v === '*' || v.toLowerCase() === 'content-type');
}

async function ensureBrowserCors() {
  if (!corsPromise) corsPromise = (async () => {
    const s3 = getS3Client();
    const bucket = getS3BucketName();
    let rules: CORSRule[] = [];
    try {
      const current = await s3.send(new GetBucketCorsCommand({ Bucket: bucket }));
      rules = current.CORSRules ?? [];
      if (rules.some(allowsUpload)) return;
    } catch (error) {
      const e = error as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (e.$metadata?.httpStatusCode !== 404 && e.name !== 'NoSuchCORSConfiguration') {
        console.error('[client-file-s3] Cannot read bucket CORS:', error);
        throw new Error('تعذر قراءة إعدادات CORS في Amazon S3. تحقق من صلاحيات دور AWS.');
      }
    }
    rules.push({ AllowedOrigins: [appOrigin()], AllowedMethods: ['POST'], AllowedHeaders: ['*'], ExposeHeaders: ['ETag'], MaxAgeSeconds: 3600 });
    try {
      await s3.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: rules } }));
    } catch (error) {
      console.error('[client-file-s3] Cannot set bucket CORS:', error);
      throw new Error('يلزم السماح بطلبات POST من نطاق الموقع في إعدادات CORS الخاصة بـ Amazon S3.');
    }
  })().catch((error) => { corsPromise = undefined; throw error; });
  await corsPromise;
}

export async function createClientFileUploadPost(key: string, contentType: string) {
  await ensureBrowserCors();
  const signed = await createPresignedPost(getS3Client(), {
    Bucket: getS3BucketName(), Key: key, Expires: 600,
    Fields: { 'Content-Type': contentType },
    Conditions: [['eq', '$Content-Type', contentType], ['content-length-range', 1, MAX_CLIENT_FILE_BYTES + 1024 * 1024]],
  });
  return { url: signed.url, fields: signed.fields, expiresIn: 600 };
}

export async function verifyUploadedClientFile(value: string, clientId: string, expectedSize: number, expectedContentType: string) {
  const object = parsePrivateS3Url(value, clientId);
  if (!object) return false;
  const head = await getS3Client().send(new HeadObjectCommand({ Bucket: object.bucket, Key: object.key }));
  const size = head.ContentLength ?? -1;
  const mime = (head.ContentType || '').split(';', 1)[0].trim().toLowerCase();
  const valid = size > 0 && size <= MAX_CLIENT_FILE_BYTES && size === expectedSize && mime === expectedContentType.toLowerCase();
  if (!valid) await getS3Client().send(new DeleteObjectCommand({ Bucket: object.bucket, Key: object.key })).catch((error) => {
    console.error('[client-file-s3] Could not delete invalid uploaded object:', error);
  });
  return valid;
}

export async function getPrivateS3Object(value: string, clientId: string, range?: string) {
  const object = parsePrivateS3Url(value, clientId);
  if (!object) return null;
  return getS3Client().send(new GetObjectCommand({
    Bucket: object.bucket,
    Key: object.key,
    ...(range ? { Range: range } : {}),
  }));
}
