import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { isSeniorManagement } from '@/lib/office-workflow';
import { OfficeManagementClient } from '@/components/admin/office-management-client';
export const metadata: Metadata = { title: 'Loutfi Law Firm — مركز الإدارة' };
export default async function OfficeManagementPage(){const session=await getCurrentUser();if(!session)redirect('/auth');if(!(await isSeniorManagement(session)))redirect('/');return <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6"><div className="mb-5"><Link href="/admin" className="text-xs font-bold text-navy-500 hover:text-navy-900">← العودة إلى الإدارة</Link><h1 className="mt-3 text-2xl font-extrabold text-navy-950">مركز إدارة Loutfi Law Firm</h1><p className="mt-1 text-sm font-medium text-navy-400">الإدارة العليا، الطلبات، المالية، زملاء العمل، السجل والأرشيف وإعدادات أقسام القضايا.</p></div><OfficeManagementClient/></main>}
