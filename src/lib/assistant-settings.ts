import 'server-only';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';

export const DEFAULT_ASSISTANT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';
export const DEFAULT_ASSISTANT_MODEL = 'gemini-3.8-flash';

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
  if(url.hostname==='generativelanguage.googleapis.com') return DEFAULT_ASSISTANT_BASE_URL;
  return url.toString().replace(/\/$/,'').replace(/\/chat\/completions$/,'');
}
function normalizeStoredBaseUrl(value:string) {
  try {
    return normalizeBaseUrl(value);
  } catch {
    return value.trim();
  }
}
export async function getAssistantSettings() {
  const rows=await prisma.$queryRawUnsafe<Array<{base_url:string;model:string;api_key_encrypted:string|null}>>(
    'SELECT "base_url","model","api_key_encrypted" FROM "assistant_settings" WHERE "id"=$1 LIMIT 1','default',
  );
  const row=rows[0];
  const rawBaseUrl=row?.base_url || process.env.ASSISTANT_API_BASE_URL || DEFAULT_ASSISTANT_BASE_URL;
  const decryptedKey = row?.api_key_encrypted ? decrypt(row.api_key_encrypted) : null;
  const environmentKey = process.env.ASSISTANT_API_KEY || process.env.GEMINI_API_KEY || '';
  const apiKey = decryptedKey || environmentKey;
  return {
    baseUrl: normalizeStoredBaseUrl(rawBaseUrl),
    model: row?.model || process.env.ASSISTANT_MODEL || DEFAULT_ASSISTANT_MODEL,
    apiKey,
    configured: Boolean(apiKey),
    source: decryptedKey ? 'database' : (environmentKey ? 'environment' : 'none'),
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
  const trimmed = baseUrl.trim().replace(/\/$/, '');
  try {
    const url = new URL(trimmed);
    // The app sends OpenAI-compatible chat/completions payloads. Google exposes
    // that compatibility API under /v1beta/openai, not the native /v1beta path.
    if (url.hostname === 'generativelanguage.googleapis.com') {
      return 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    }
  } catch {
    // Preserve a useful URL construction error for invalid custom providers.
  }
  return trimmed.replace(/\/chat\/completions$/, '') + '/chat/completions';
}

export function isGeminiApiBaseUrl(baseUrl:string) {
  try {
    return new URL(baseUrl).hostname === 'generativelanguage.googleapis.com';
  } catch {
    return false;
  }
}

/** Retry a Google OpenAI-compatible request with the currently recommended model
 * if an older model returns 404. Never retry non-Google providers or other errors.
 */
export async function fetchAssistantChat(
  settings: { baseUrl: string; model: string; apiKey: string },
  payload: Record<string, unknown>,
  signal?: AbortSignal,
) {
  const isGoogle = isGeminiApiBaseUrl(settings.baseUrl);
  const candidates = isGoogle
    ? [settings.model, 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite']
    : [settings.model];
  const models = candidates.filter((model, index) => Boolean(model) && candidates.indexOf(model) === index);
  const retryableGoogleStatuses = new Set([404, 429, 500, 502, 503, 504]);

  for (let i = 0; i < models.length; i++) {
    const response = await fetch(assistantChatUrl(settings.baseUrl), {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + settings.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, model: models[i] }),
      signal,
      cache: 'no-store',
    });
    const shouldTryAlternate = isGoogle
      && i < models.length - 1
      && retryableGoogleStatuses.has(response.status);
    if (!shouldTryAlternate) {
      return { response, model: models[i], usedFallbackModel: i > 0 };
    }
    await response.body?.cancel().catch(() => undefined);
  }
  throw new Error('ASSISTANT_NO_MODEL_CANDIDATE');
}
