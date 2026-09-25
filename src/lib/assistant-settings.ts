import 'server-only';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';

export const DEFAULT_ASSISTANT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';
export const DEFAULT_ASSISTANT_MODEL = 'gemini-2.5-flash';

function encryptionKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return crypto.createHash('sha256').update('assistant-settings-v1:' + secret).digest();
}
function encrypt(value:string):string {
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',encryptionKey(),iv);
  const ciphertext=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
  const tag=cipher.getAuthTag();
  return [iv.toString('base64url'),tag.toString('base64url'),ciphertext.toString('base64url')].join('.');
}
function decrypt(value:string):string|null {
  try {
    const [ivRaw,tagRaw,dataRaw]=value.split('.');
    if(!ivRaw||!tagRaw||!dataRaw)return null;
    const decipher=crypto.createDecipheriv('aes-256-gcm',encryptionKey(),Buffer.from(ivRaw,'base64url'));
    decipher.setAuthTag(Buffer.from(tagRaw,'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(dataRaw,'base64url')),decipher.final()]).toString('utf8');
  } catch { return null; }
}
function normalizeBaseUrl(value:string) {
  const url=new URL(value.trim());
  if(url.protocol!=='https:'&&url.hostname!=='localhost'&&url.hostname!=='127.0.0.1') throw new Error('عنوان API يجب أن يستخدم HTTPS.');
  return url.toString().replace(/\/$/,'').replace(/\/chat\/completions$/,'');
}
export async function getAssistantSettings() {
  const rows=await prisma.$queryRawUnsafe<Array<{base_url:string;model:string;api_key_encrypted:string|null}>>(
    'SELECT "base_url","model","api_key_encrypted" FROM "assistant_settings" WHERE "id"=$1 LIMIT 1','default',
  );
  const row=rows[0];
  return {
    baseUrl: row?.base_url || process.env.ASSISTANT_API_BASE_URL || DEFAULT_ASSISTANT_BASE_URL,
    model: row?.model || process.env.ASSISTANT_MODEL || DEFAULT_ASSISTANT_MODEL,
    apiKey: row?.api_key_encrypted ? decrypt(row.api_key_encrypted) : (process.env.ASSISTANT_API_KEY || process.env.GEMINI_API_KEY || ''),
    configured: Boolean(row?.api_key_encrypted || process.env.ASSISTANT_API_KEY || process.env.GEMINI_API_KEY),
    source: row ? 'database' : (process.env.ASSISTANT_API_KEY || process.env.GEMINI_API_KEY ? 'environment' : 'none'),
  };
}
export async function saveAssistantSettings(input:{baseUrl:string;model:string;apiKey?:string}) {
  const baseUrl=normalizeBaseUrl(input.baseUrl);
  const model=input.model.trim();
  if(!model) throw new Error('اسم الموديل مطلوب.');
  const current=await getAssistantSettings();
  const encrypted=input.apiKey?.trim() ? encrypt(input.apiKey.trim()) : (current.apiKey ? encrypt(current.apiKey) : null);
  await prisma.$executeRawUnsafe(
    'INSERT INTO "assistant_settings" ("id","base_url","model","api_key_encrypted","updated_at") VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT ("id") DO UPDATE SET "base_url"=EXCLUDED."base_url","model"=EXCLUDED."model","api_key_encrypted"=EXCLUDED."api_key_encrypted","updated_at"=NOW()',
    'default',baseUrl,model,encrypted,
  );
  return getAssistantSettings();
}
export function assistantChatUrl(baseUrl:string) {
  return baseUrl.replace(/\/$/,'') + '/chat/completions';
}
