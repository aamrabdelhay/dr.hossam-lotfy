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
