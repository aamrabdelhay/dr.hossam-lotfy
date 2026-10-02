import { NextResponse } from 'next/server';
import { OFFICE_MCP_TOOLS, callOfficeMcpTool } from '@/lib/mcp/office-tools';

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
    return error(body.id, -32001, 'MCP authentication is not enabled on this endpoint yet.');
  }

  return error(body.id, -32601, 'Method not found');
}
