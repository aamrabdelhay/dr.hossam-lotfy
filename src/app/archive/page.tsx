import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import Link from 'next/link';
import {getCurrentUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {ArchiveManagement} from '@/components/admin/archive-management';

export const metadata:Metadata={title:'الأرشيف'};

export default async function ArchivePage(){
  const session=await getCurrentUser();
  if(!session)redirect('/auth');
  const entries=await prisma.$queryRawUnsafe<any[]>(`SELECT a.*,u."name" AS deleted_by_user_name,l."fullName" AS deleted_by_lawyer_name FROM "office_archive" a LEFT JOIN "users" u ON u."id"=a."deleted_by_user_id" LEFT JOIN "lawyers" l ON l."id"=a."deleted_by_lawyer_id" ORDER BY a."deleted_at" DESC LIMIT 1000`);
  return <main dir="rtl" className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
    <div className="mb-6">
      <Link href="/" className="text-xs font-bold text-navy-500">← الرئيسية</Link>
      <h1 className="mt-3 flex items-center gap-2 text-2xl font-extrabold text-navy-950"><Archive size={22} className="text-gold-600"/>الأرشيف</h1>
      <p className="mt-1 text-sm text-navy-400">أرشيف منظم لكل ما تم حذفه، مع البحث والتصفية والاسترجاع السريع.</p>
    </div>
    <ArchiveManagement initialEntries={entries}/>
  </main>
}
