import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BriefcaseBusiness, Mail, ShieldCheck, UserCircle2 } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { isSeniorManagement } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';
import { ROLE_LABEL } from '@/lib/constants';
import { ProfileRequests } from '@/components/profile-requests';
import { Card } from '@/components/ui';

export const metadata: Metadata = { title: 'ملفي الشخصي' };

export default async function ProfilePage() {
  const session=await getCurrentUser();
  if(!session)redirect('/auth');

  if(session.role==='lawyer') {
    redirect('/lawyers/'+session.slug);
  }

  const account=await prisma.user.findUnique({where:{id:session.userId},select:{name:true,email:true,role:true}});
  if(!account)redirect('/auth');

  const linkedLawyer=account.email
    ? await prisma.lawyer.findFirst({
        where:{active:true,OR:[{email:account.email.toLowerCase()},{googleEmail:account.email.toLowerCase()}]},
        select:{slug:true},
      })
    : null;
  if(linkedLawyer)redirect('/lawyers/'+linkedLawyer.slug);

  const senior=await isSeniorManagement(session);
  return <main dir="rtl" className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
    <Card className="overflow-hidden border-gold-200">
      <div className="bg-navy-950 px-6 py-7 text-white">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-gold-400"><UserCircle2 size={28}/></span>
          <div><p className="text-[10px] font-bold tracking-[1.5px] text-gold-300">الملف الشخصي</p><h1 className="mt-1 text-xl font-extrabold">{account.name}</h1><p className="mt-1 text-xs text-ivory-300">{ROLE_LABEL[account.role]||account.role}</p></div>
        </div>
      </div>
      <div className="grid gap-3 p-6 sm:grid-cols-2">
        <div className="rounded-xl bg-ivory-50 p-4"><div className="flex items-center gap-2 text-[10px] font-bold text-navy-400"><Mail size={14}/> البريد الإلكتروني</div><p className="mt-2 break-all font-mono text-xs font-extrabold text-navy-900" dir="ltr">{account.email}</p></div>
        <div className="rounded-xl bg-ivory-50 p-4"><div className="flex items-center gap-2 text-[10px] font-bold text-navy-400"><ShieldCheck size={14}/> الصلاحية</div><p className="mt-2 text-xs font-extrabold text-navy-900">{ROLE_LABEL[account.role]||account.role}{senior?' — وصول شامل لكل الفروع':''}</p></div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-navy-100 p-6">
        <Link href="/admin/office" className="inline-flex items-center gap-2 rounded-xl bg-navy-950 px-4 py-2.5 text-xs font-extrabold text-white"><BriefcaseBusiness size={15}/> الإدارة</Link>
        <Link href="/lawyers" className="inline-flex items-center gap-2 rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-xs font-extrabold text-navy-700">زملاء العمل</Link>
      </div>
    </Card>
    <div className="mt-6"><ProfileRequests/></div>
  </main>;
}
