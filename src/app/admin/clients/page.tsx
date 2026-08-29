import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ClientsClient } from '@/components/admin/clients-client';
export const metadata: Metadata = { title: 'العملاء — الإدارة' };
export default async function ClientsPage(){const session=await getCurrentUser();if(!session||(!session.isAdmin&&session.role!=='admin'))redirect('/auth');const clients=await prisma.$queryRawUnsafe<Array<{id:string;name:string;phone:string|null;email:string|null;nationalId:string|null;address:string|null;notes:string|null;caseCount:number}>>(`SELECT c."id",c."name",c."phone",c."email",c."nationalId",c."address",c."notes",COUNT(cr."id")::int AS "caseCount" FROM "clients" c LEFT JOIN "case_records" cr ON cr."clientId"=c."id" GROUP BY c."id" ORDER BY lower(c."name") ASC LIMIT 500`);const cases=await prisma.$queryRawUnsafe<Array<{id:string;name:string;number:string;clientId:string|null}>>(`SELECT "id","name","number","clientId" FROM "case_records" ORDER BY "id" DESC LIMIT 500`);return <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6"><Link href="/admin" className="mb-5 inline-flex items-center gap-2 rounded-full border border-navy-200 bg-white px-4 py-2 text-[11px] font-bold text-navy-600 shadow-soft"><ArrowRight size={14}/> العودة للإدارة</Link><ClientsClient initialClients={clients} initialCases={cases}/></main>}
