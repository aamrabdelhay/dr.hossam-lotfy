import { NextResponse } from 'next/server';
import { runWorkflow } from '@/lib/workflow-engine';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
/** Scheduled run of enabled workflow rules. Same bearer-secret check as the other cron routes. Not scheduled anywhere until someone adds it to the deploy cron list. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ sent: await runWorkflow(new Date().toISOString().slice(0, 10)) });
}
