import 'server-only';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, getCurrentSessionRecord } from '@/lib/auth';
import type { SessionUser } from '@/lib/auth';

export const MCP_SCOPES = ['office:read', 'office:write'] as const;
const ACCESS_TTL_MS = 60 * 60 * 1000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CODE_TTL_MS = 5 * 60 * 1000;
const hash = (v: string) => crypto.createHash('sha256').update(v).digest('hex');
const token = (prefix: string) => prefix + '_' + crypto.randomBytes(32).toString('base64url');

export function appOrigin(req: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';
  const host = req.headers.get('host');
  if (!host) throw new Error('Missing Host header');
  return proto + '://' + host;
}
export function resourceUrl(req: Request) { return appOrigin(req) + '/mcp'; }
export function validChatGptClient(id: string) { return id === 'https://chatgpt.com/oauth/client.json' || id.startsWith('https://chatgpt.com/oauth/'); }
export function validRedirectUri(uri: string) {
  try { const u = new URL(uri); return u.protocol === 'https:' && u.hostname === 'chatgpt.com' && (u.pathname === '/connector_platform_oauth_redirect' || u.pathname.startsWith('/connector/oauth/')); } catch { return false; }
}
export function parseScopes(value: string | null | undefined) {
  const requested = (value || 'office:read').split(/[\s,]+/).filter(Boolean);
  if (!requested.every((s) => (MCP_SCOPES as readonly string[]).includes(s))) throw new Error('invalid_scope');
  if (!requested.includes('office:read')) requested.unshift('office:read');
  return [...new Set(requested)];
}
export function pkceChallenge(verifier: string) { return crypto.createHash('sha256').update(verifier).digest('base64url'); }

export async function createAuthorizationCode(input: { clientId:string; redirectUri:string; codeChallenge:string; scope:string[]; resource:string }) {
  const session = await getCurrentSessionRecord();
  if (!session) throw new Error('login_required');
  const code = token('mcpcode');
  await prisma.$executeRawUnsafe('INSERT INTO "mcp_oauth_codes" ("id","codeHash","authSessionId","clientId","redirectUri","codeChallenge","scope","resource","expiresAt","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())', 'code_'+crypto.randomUUID(), hash(code), session.id, input.clientId, input.redirectUri, input.codeChallenge, input.scope.join(' '), input.resource, new Date(Date.now()+CODE_TTL_MS));
  return code;
}
export async function exchangeAuthorizationCode(input:{code:string;clientId:string;redirectUri:string;codeVerifier:string;resource:string}) {
  const rows=await prisma.$queryRawUnsafe<any[]>('SELECT * FROM "mcp_oauth_codes" WHERE "codeHash"=$1 LIMIT 1',hash(input.code)); const row=rows[0];
  if(!row || row.usedAt || row.expiresAt<new Date() || row.clientId!==input.clientId || row.redirectUri!==input.redirectUri || row.resource!==input.resource || pkceChallenge(input.codeVerifier)!==row.codeChallenge) throw new Error('invalid_grant');
  const used=await prisma.$executeRawUnsafe('UPDATE "mcp_oauth_codes" SET "usedAt"=NOW() WHERE "id"=$1 AND "usedAt" IS NULL',row.id);
  if(used.count!==1) throw new Error('invalid_grant');
  const accessToken=token('mcpat'), refreshToken=token('mcprt');
  await prisma.$executeRawUnsafe('INSERT INTO "mcp_oauth_tokens" ("id","accessTokenHash","refreshTokenHash","authSessionId","clientId","scope","resource","expiresAt","refreshExpiresAt","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())','tok_'+crypto.randomUUID(),hash(accessToken),hash(refreshToken),row.authSessionId,row.clientId,row.scope,row.resource,new Date(Date.now()+ACCESS_TTL_MS),new Date(Date.now()+REFRESH_TTL_MS));
  return {accessToken,refreshToken,scope:row.scope};
}
export async function refreshAccessToken(input:{refreshToken:string;clientId:string;resource:string}) {
  const rows=await prisma.$queryRawUnsafe<any[]>('SELECT * FROM "mcp_oauth_tokens" WHERE "refreshTokenHash"=$1 LIMIT 1',hash(input.refreshToken)); const row=rows[0];
  if(!row || row.revokedAt || row.refreshExpiresAt<new Date() || row.clientId!==input.clientId || row.resource!==input.resource) throw new Error('invalid_grant');
  const accessToken=token('mcpat');
  await prisma.$executeRawUnsafe('UPDATE "mcp_oauth_tokens" SET "accessTokenHash"=$2,"expiresAt"=$3 WHERE "id"=$1',row.id,hash(accessToken),new Date(Date.now()+ACCESS_TTL_MS));
  return {accessToken,scope:row.scope};
}
async function userFromSession(s:any):Promise<SessionUser|null>{
  if(s.role==='admin'&&s.userId){const u=await prisma.user.findUnique({where:{id:s.userId}});if(!u)return null;return {role:'admin',userId:u.id,name:u.name,userRole:(s.userRole||u.role) as any};}
  if(s.role==='lawyer'&&s.lawyerId){const l=await prisma.lawyer.findUnique({where:{id:s.lawyerId}});if(!l||!l.active)return null;return {role:'lawyer',lawyerId:l.id,name:l.fullName,slug:l.slug,isAdmin:false};}
  return null;
}
export async function authenticateAccessToken(raw:string, requiredScope?:string){
  const rows=await prisma.$queryRawUnsafe<any[]>('SELECT t.*,s."role",s."userId",s."lawyerId",s."userRole",s."revokedAt" AS "sessionRevokedAt",s."expiresAt" AS "sessionExpiresAt" FROM "mcp_oauth_tokens" t JOIN "auth_sessions" s ON s."id"=t."authSessionId" WHERE t."accessTokenHash"=$1 LIMIT 1',hash(raw)); const row=rows[0];
  if(!row||row.revokedAt||row.expiresAt<new Date()||row.sessionRevokedAt||row.sessionExpiresAt<new Date())return null;
  const scopes=row.scope.split(' ').filter(Boolean); if(requiredScope&&!scopes.includes(requiredScope))return null;
  const user=await userFromSession(row); if(!user)return null;
  return {user,scopes};
}
export async function currentUser(){return getCurrentUser();}
