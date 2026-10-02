import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAuthorizationCode, validChatGptClient, validRedirectUri, parseScopes, resourceUrl, appOrigin } from '@/lib/mcp/oauth';

function bad(message:string){return new NextResponse(message,{status:400,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
function params(req:Request){const u=new URL(req.url);return {u,responseType:u.searchParams.get('response_type'),clientId:u.searchParams.get('client_id')||'',redirectUri:u.searchParams.get('redirect_uri')||'',state:u.searchParams.get('state')||'',challenge:u.searchParams.get('code_challenge')||'',resource:u.searchParams.get('resource')||resourceUrl(req),scope:u.searchParams.get('scope')};}
function consent(req:Request,p:any,name:string,scope:string[]){const action=new URL(req.url);action.searchParams.set('approve','1');const safe=name.replace(/[<>]/g,'');const html='<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>ربط مساعد مكتب لوتفي</title><style>body{font-family:system-ui,sans-serif;background:#f7f5f0;color:#18263a;padding:32px}.box{max-width:520px;margin:10vh auto;background:#fff;border:1px solid #ddd;border-radius:20px;padding:28px;box-shadow:0 8px 30px #0001}button{width:100%;padding:13px;border:0;border-radius:12px;background:#18263a;color:#fff;font-weight:700}</style></head><body><main class="box"><h2>ربط مساعد مكتب لوتفي</h2><p>الحساب: <b>'+safe+'</b></p><p>سيتمكن ChatGPT من استخدام بيانات المكتب وتنفيذ الإجراءات وفق صلاحيات حسابك.</p><p><b>الصلاحيات:</b> '+scope.join(' ')+'</p><form method="post" action="'+action.toString()+'"><button>السماح بالربط</button></form></main></body></html>';return new NextResponse(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});}
export async function GET(req:Request){
  const p=params(req);
  if(p.responseType!=='code'||!validChatGptClient(p.clientId)||!validRedirectUri(p.redirectUri)||!p.challenge)return bad('invalid_request');
  if(p.resource!==resourceUrl(req))return bad('invalid_target');
  let scope:string[];try{scope=parseScopes(p.scope)}catch{return bad('invalid_scope');}
  const user=await getCurrentUser();
  if(!user){const login=new URL('/auth',req.url);login.searchParams.set('next',new URL(req.url).toString());return NextResponse.redirect(login);}
  return consent(req,p,user.name,scope);
}
export async function POST(req:Request){
  const p=params(req);
  if(!validChatGptClient(p.clientId)||!validRedirectUri(p.redirectUri)||!p.challenge||p.resource!==resourceUrl(req))return bad('invalid_request');
  const user=await getCurrentUser();if(!user)return NextResponse.redirect(new URL('/auth',req.url));
  const scope=parseScopes(p.scope);const code=await createAuthorizationCode({clientId:p.clientId,redirectUri:p.redirectUri,codeChallenge:p.challenge,scope,resource:p.resource});
  const out=new URL(p.redirectUri);out.searchParams.set('code',code);if(p.state)out.searchParams.set('state',p.state);out.searchParams.set('iss',appOrigin(req));return NextResponse.redirect(out);
}