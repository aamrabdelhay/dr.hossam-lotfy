import 'server-only';

import {
  DeleteObjectCommand,
  GetBucketCorsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutBucketCorsCommand,
  S3Client,
  type CORSRule,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { awsCredentialsProvider } from '@vercel/oidc-aws-credentials-provider';

export const MAX_CLIENT_FILE_BYTES = 100 * 1024 * 1024;
const POST_BODY_OVERHEAD_BYTES = 1024 * 1024;
const UPLOAD_URL_TTL_SECONDS = 10 * 60;

let s3Client: S3Client | undefined;
let corsSetup: Promise<void> | undefined;

export function getS3BucketName() {
  const bucket = process.env.S3_BUCKET_NAME?.trim();
  if (!bucket) throw new Error('إعداد Amazon S3 غير مكتمل: متغير S3_BUCKET_NAME غير موجود.');
  return bucket;
}

export function getS3Client() {
  const region = process.env.AWS_REGION?.trim();
  const roleArn = process.env.AWS_ROLE_ARN?.trim();
  if (!region || !roleArn) {
    throw new Error('إعداد Amazon S3 غير مكتمل: اربط مخزن S3 بمشروع Vercel في بيئة Production.');
  }
  if (!s3Client) {
    s3Client = new S3Client({
      region,
      credentials: awsCredentialsProvider({ roleArn }),
    });
  }
  return s3Client;
}

export function makePrivateS3Url(key: string) {
  return 's3://' + getS3BucketName() + '/' + key;
}

export function parsePrivateS3Url(value: string | null | undefined, clientId?: string) {
  const bucket = process.env.S3_BUCKET_NAME?.trim();
  if (!value || !bucket) return null;
  const prefix = 's3://' + bucket + '/';
  if (!value.startsWith(prefix)) return null;

  const key = value.slice(prefix.length);
  const parts = key.split('/');
  if (
    !key ||
    key.includes('\\') ||
    key.includes('?') ||
    key.includes('#') ||
    parts.some((part) => !part || part === '.' || part === '..') ||
    (clientId && !key.startsWith('clients/' + clientId + '/'))
  ) {
    return null;
  }
  return { bucket, key };
}

function appOrigin() {
  const candidate = process.env.NEXT_PUBLIC_APP_URL || proces...[truncated]          console.error('[client-file-s3] Could not read S3 CORS configuration:', error);
          throw new Error('تعذر التحقق من إعدادات CORS في Amazon S3. تأكد من صلاحيات إعدادات الـ Bucket.');
        }
      }

      rules.push({
        AllowedOrigins: [appOrigin()],
        AllowedMethods: ['POST'],
        AllowedHeaders: ['*'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3600,
      });
      try {
        await s3.send(new PutBucketCorsCommand({
          Bucket: bucket,
          CORSConfiguration: { CORSRules: rules },
        }));
        console.info('[client-file-s3] Configured browser upload CORS for the production app origin.');
      } catch (error) {
        console.error('[client-file-s3] Could not configure S3 CORS:', error);
        throw new Error('Amazon S3 متصل، لكن دور AWS لا يسمح بضبط CORS تلقائيًا. يلزم السماح بطلبات POST من نطاق الموقع داخل إعدادات Bucket.');
      }
    })().catch((error) => {
      corsSetup = undefined;
      throw error;
    });
  }
  await corsSetup;
}

export async function createClientFileUploadPost(key: string, contentType: string) {
  await ensureS3BrowserUploadCors();
  const { url, fields } = await createPresignedPost(getS3Client(), {
    Bucket: getS3BucketName(),
    Key: key,
    Expires: UPLOAD_URL_TTL_SECONDS,
    Fields: { 'Content-Type': contentType },
    Conditions: [
      ['eq', '$Content-Type', contentType],
      ['content-length-range', 1, MAX_CLIENT_FILE_BYTES + POST_BODY_OVERHEAD_BYTES],
    ],
  });
  return { url, fields, expiresIn: UPLOAD_URL_TTL_SECONDS };
}

export async function verifyUploadedClientFile(
  value: string,
  clientId: string,
  expectedSize: number,
  expectedContentType: string,
) {
  const object = parsePrivateS3Url(value, clientId);
  if (!object) return false;

  const head = await getS3Client().send(new HeadObjectCommand({
    Bucket: object.bucket,
    Key: object.key,
  }));

  const size = head.ContentLength ?? -1;
  const contentType = (head.ContentTyp...[truncated]