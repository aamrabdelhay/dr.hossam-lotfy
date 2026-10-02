import { NextResponse } from 'next/server';
import { appOrigin, resourceUrl } from '@/lib/mcp/oauth';
export async function GET(req: Request) {
  const origin=appOrigin(req);
  return NextResponse.json({resource:resourceUrl(req),authorization_servers:[origin],scopes_supported:['office:read','office:write'],resource_documentation:origin+'/docs/mcp-office-assistant'},{headers:{'Cache-Control':'public, max-age=300'}});
}