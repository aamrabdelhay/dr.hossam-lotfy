import { NextResponse } from 'next/server';
import { OFFICE_MCP_TOOLS, callOfficeMcpTool, isWriteTool } from '@/lib/mcp/office-tools';
import { authenticateAccessToken, appOrigin } from '@/lib/mcp/oauth';

const PROTOCOL_VERSION = '2025-06-18';

function jsonrpc(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id, result });
}

function error(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } }, { status: 400 });
}

export async function GET() {
  return NextResponse.json(
    { name: 'Loutfi Office Assistant', version: '0.1.0', transport: 'streamable-http', protocolVersion: PROTOCOL_VERSION },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || body.jsonrpc !== '2.0') return error(body?.id ?? null, -32600, 'Invalid JSON-RPC request');

  if (body.method === 'initialize') {
    return jsonrpc(body.id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: 'Loutfi Office Assistant', version: '0.1.0' },
      instructions: 'مساعد مكتب لوتفي. استخدم الأدوات للوصول إلى بيانات المكتب وتنفيذ الإجراءات المصرح بها. لا تفترض صلاحيات المستخدم.',
    });
  }

  if (body.method === 'notifications/initialized') {
    return new NextResponse(null, { status: 202 });
  }

  if (body.method === 'tools/list') {
    return jsonrpc(body.id, { tools: OFFICE_MCP_TOOLS });
  }

  if (body.method === 'tools/call') {
    const name = body.params?.name;
    const authorization = req.headers.get('authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    const requiredScope = isWriteTool(name) ? 'office:write' : 'office:read';
    const auth = token ? await authenticateAccessToken(token, requiredScope) : null;
    if (!auth) {
      const resourceMetadata = appOrigin(req) + '/.well-known/oauth-protected-resource';
      return new NextResponse(JSON.stringify({jsonrpc:'2.0',id:body.id,result:{content:[{type:'text',text:'Authentication required.'}],isError:true,_meta:{'mcp/www_authenticate':['Bearer resource_metadata="' + resourceMetadata + '", scope="' + requiredScope + '", error="invalid_token", error_description="Valid OAuth access is required."']}}}),{status:401,headers:{'Content-Type':'application/json', 'WWW-Authenticate':'Bearer resource_metadata="' + resourceMetadata + '", scope="' + requiredScope + '"'}});
    }
    try {
      const result = await callOfficeMcpTool(name, body.params?.arguments ?? {}, auth.user);
      return jsonrpc(body.id, { content:[{type:'text',text:JSON.stringify(result)}], structuredContent:result, isError:false });
    } catch (e) {
      return jsonrpc(body.id, { content:[{type:'text',text:e instanceof Error ? e.message : 'Tool execution failed'}], isError:true });
    }
  }

  return error(body.id, -32601, 'Method not found');
}
