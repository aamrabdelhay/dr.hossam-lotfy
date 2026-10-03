import { NextResponse } from 'next/server';
import { exchangeAuthorizationCode, refreshAccessToken, appOrigin } from '@/lib/mcp/oauth';
function json(data:unknown,status=200){return NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});}
export async function POST(req:Request){
  const p=new URLSearchParams(await req.text()); const grantType=p.get('grant_type'); const clientId=p.get('client_id')||''; const resource=p.get('resource')||appOrigin(req)+'/mcp';
  try{
    if(grantType==='authorization_code'){const r=await exchangeAuthorizationCode({code:p.get('code')||'',clientId,redirectUri:p.get('redirect_uri')||'',codeVerifier:p.get('code_verifier')||'',resource});return json({token_type:'Bearer',access_token:r.accessToken,refresh_token:r.refreshToken,expires_in:3600,scope:r.scope});}
    if(grantType==='refresh_token'){const r=await refreshAccessToken({refreshToken:p.get('refresh_token')||'',clientId,resource});return json({token_type:'Bearer',access_token:r.accessToken,expires_in:3600,scope:r.scope});}
    return json({error:'unsupported_grant_type'},400);
  }catch(e){return json({error:e instanceof Error?e.message:'invalid_grant'},400);}
}