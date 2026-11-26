import 'server-only';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';

export type AuditInput = {
  actorUserId?: string | null;
  actorLawyerId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function logAuditEvent(input: AuditInput): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "office_audit_events"
        ("id","actor_user_id","actor_lawyer_id","action","resource_type","resource_id","summary","metadata","ip_address","user_agent")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)`,
      'audit_' + crypto.randomUUID().replaceAll('-', ''),
      input.actorUserId ?? null,
      input.actorLawyerId ?? null,
      input.action.slice(0, 100),
      input.resourceType?.slice(0, 80) ?? null,
      input.resourceId ?? null,
      input.summary.slice(0, 1000),
      JSON.stringify(input.metadata ?? {}),
      input.ipAddress?.slice(0, 80) ?? null,
      input.userAgent?.slice(0, 300) ?? null,
    );
  } catch (error) {
    // Audit storage must never break a user-facing operation; keep the failure visible in logs.
    console.error('[audit] Failed to persist audit event:', error);
  }
}

/** Record that someone opened a case or client page. Skips a repeat by the same person on the same record within 10 minutes. Never throws. */
export async function logView(session: { role: 'admin'; userId: string } | { role: 'lawyer'; lawyerId: string } | null, resourceType: 'case' | 'client', resourceId: string): Promise<void> {
  if (!session) return;
  try {
    const userId = session.role === 'admin' ? session.userId : null;
    const lawyerId = session.role === 'lawyer' ? session.lawyerId : null;
    const recent = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
      `SELECT count(*)::int AS n FROM "office_audit_events" WHERE "action"='VIEW' AND "resource_type"=$1 AND "resource_id"=$2 AND COALESCE("actor_user_id",'')=COALESCE($3,'') AND COALESCE("actor_lawyer_id",'')=COALESCE($4,'') AND "created_at" > now() - interval '10 minutes'`,
      resourceType, resourceId, userId, lawyerId,
    );
    if (recent[0]?.n) return;
    await logAuditEvent({ actorUserId: userId, actorLawyerId: lawyerId, action: 'VIEW', resourceType, resourceId, summary: 'Opened ' + resourceType + ' page' });
  } catch (error) {
    console.error('[audit] view log failed:', error);
  }
}
