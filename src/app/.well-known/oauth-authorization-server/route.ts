import { NextResponse } from 'next/server';
import { appOrigin } from '@/lib/mcp/oauth';
export async function GET(req: Request) {
  const origin=appOrigin(req);
  return NextResponse.json({issuer:origin,authorization_endpoint:origin+'/oauth/authorize',token_endpoint:origin+'/oauth/token',response_types_supported:['code'],grant_types_supported:['authorization_code','refresh_token'],token_endpoint_auth_methods_supported:['none'],code_challenge_methods_supported:['S256'],scopes_supported:['office:read','office:write'],client_id_metadata_document_supported:true,authorization_response_iss_parameter_supported:true},{headers:{'Cache-Control':'public, max-age=300'}});
}