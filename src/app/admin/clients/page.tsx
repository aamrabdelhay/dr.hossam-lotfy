import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ClientsManagementClient } from '@/components/admin/clients-management-client';

export const metadata: Metadata = { title: 'العملاء — الإدارة' };

type AppointmentRow = {
  id: string;
  clientId: string;
  date: string | null;
  time: string | null;
  type: string;
  status: string;
};

export default async function ClientsPage() {
  const session = await getCurrentUser();
  const admin = !!session && (session.role === 'admin' || (session.role === 'lawyer' && session.isAdmin));
  if (!admin) redirect('/auth');

  const [clients, cases, lawyers, appointments] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
      nationalId: string | null;
      address: string | null;
      notes: string | null;
      assignedLawyerId: string | null;
      caseCount: number;
      status: string;
    }>>(`SELECT c."id",c."name",c."phone",c."email",c."nationalId",c."address",c."notes",c."assignedLawyerId",c."status",COUNT(cr."id")::int AS "caseCount" FROM "clients" c LEFT JOIN "case_records" cr ON cr."clientId"=c."id" WHERE COALESCE(c."status",'MAIN') <> 'DELETED' GROUP BY c."id" ORDER BY lower(c."name") ASC LIMIT 500`),
    prisma.$queryRawUnsafe<Array<{id:string;name:string;number:string;clientId:string|null}>>(`SELECT "id","name","number","clientId" FROM "case_records" WHERE COALESCE("archived_at",NULL) IS NULL ORDER BY "id" DESC LIMIT 500`),
    prisma.$queryRawUnsafe<Array<{id:string;name:string}>>(`SELECT "id","fullName" AS "name" FROM "lawyers" WHERE "active"=true ORDER BY "fullName" ASC`),
    prisma.$queryRawUnsafe<AppointmentRow[]>(`SELECT "id","client_id" AS "clientId","appointment_date"::text AS "date","appointment_time" AS "time","appointment_type" AS "type","status" FROM "client_appointments" WHERE "status" <> 'CANCELLED' ORDER BY ("appointment_date" IS NULL) DESC, "appointment_date" ASC NULLS LAST, "appointment_time" ASC NULLS LAST LIMIT 2000`),
  ]);

  const nextAppointments = new Map<string, AppointmentRow>();
  for (const appointment of appointments) {
    if (!nextAppointments.has(appointment.clientId)) nextAppointments.set(appointment.clientId, appointment);
  }

  const enrichedClients = clients.map((client) => ({
    ...client,
    nextAppointment: nextAppointments.get(client.id) ?? null,
  }));

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
      <Link href="/admin" className="mb-5 inline-flex items-center gap-2 rounded-full border border-navy-200 bg-white px-4 py-2 text-[11px] font-bold text-navy-600 shadow-soft">
        <ArrowRight size={14}/> العودة للإدارة
      </Link>
      <ClientsManagementClient initialClients={enrichedClients} initialCases={cases} lawyers={lawyers}/>
    </main>
  );
}
