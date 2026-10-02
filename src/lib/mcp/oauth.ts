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
  await prisma.mcpOAuthCode.create({ data: { codeHash:hash(code), authSessionId:session.id, clientId:input.clientId, redirectUri:input.redirectUri, codeChallenge:input.codeChallenge, scope:input.scope.join(' '), resource:input.resource, expiresAt:new Date(Date.now()+CODE_TTL_MS) } });
  return code;
}
export async function exchangeAuthorizationCode(input:{code:string;clientId:string;redirectUri:string;codeVerifier:string;resource:string}) {
  const row=await prisma.mcpOAuthCode.findUnique({where:{codeHash:hash(input.code)}});
  if(!row || row.usedAt || row.expiresAt<new Date() || row.clientId!==input.clientId || row.redirectUri!==input.redirectUri || row.resource!==input.resource || pkceChallenge(input.codeVerifier)!==row.codeChallenge) throw new Error('invalid_grant');
  const used=await prisma.mcpOAuthCode.updateMany({where:{id:row.id,usedAt:null},data:{usedAt:new Date()}});
  if(used.count!==1) throw new Error('invalid_grant');
  const accessToken=token('mcpat'), refreshToken=token('mcprt');
  await prisma.mcpOAuthToken.create({data:{accessTokenHash:hash(accessToken),refreshTokenHash:hash(refreshToken),authSessionId:row.authSessionId,clientId:row.clientId,scope:row.scope,resource:row.resource,expiresAt:new Date(Date.now()+ACCESS_TTL_MS),refreshExpiresAt:new Date(Date.now()+REFRESH_TTL_MS)}});
  return {accessToken,refreshToken,scope:row.scope};
}
export async function refreshAccessToken(input:{refreshToken:string;clientId:string;resource:string}) {
  const row=await prisma.mcpOAuthToken.findUnique({where:{refreshTokenHash:hash(input.refreshToken)}});
  if(!row || row.revokedAt || row.refreshExpiresAt<new Date() || row.clientId!==input.clientId || row.resource!==input.resource) throw new Error('invalid_grant');
  const accessToken=token('mcpat');
  await prisma.mcpOAuthToken.update({where:{id:row.id},data:{accessTokenHash:hash(accessToken),expiresAt:new Date(Date.now()+ACCESS_TTL_MS)}});
  return {accessToken,scope:row.scope};
}
async function userFromSession(s:any):Promise<SessionUser|null>{
  if(s.role==='admin'&&s.userId){const u=await prisma.user.findUnique({where:{id:s.userId}});if(!u)return null;return {role:'admin',userId:u.id,name:u.name,userRole:(s.userRole||u.role) as any};}
  if(s.role==='lawyer'&&s.lawyerId){const l=await prisma.lawyer.findUnique({where:{id:s.lawyerId}});if(!l||!l.active)return null;return {role:'lawyer',lawyerId:l.id,name:l.fullName,slug:l.slug,isAdmin:false};}
  return null;
}
export async function authenticateAccessToken(raw:string, requiredScope?:string){
  const row=await prisma.mcpOAuthToken.findUnique({where:{accessTokenHash:hash(raw)},include:{authSession:true}});
  if(!row||row.revokedAt||row.expiresAt<new Date()||row.authSession.revokedAt||row.authSession.expiresAt<new Date())return null;
  const scopes=row.scope.split(' ').filter(Boolean); if(requiredScope&&!scopes.includes(requiredScope))return null;
  const user=await userFromSession(row.authSession); if(!user)return null;
  return {user,scopes};
}
export async function currentUser(){return getCurrentUser();}
