import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ProfileRequests } from '@/components/profile-requests';
export const metadata:Metadata={title:'الصفحة الشخصية'};
export default async function ProfilePage(){const session=await getCurrentUser();if(!session)redirect('/auth');return <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6"><h1 className="text-2xl font-extrabold text-navy-950">الصفحة الشخصية</h1><p className="mt-1 text-sm text-navy-400">طلبات الإجازة وطلبات الصرف والمتابعة مع الإدارة.</p><div className="mt-6"><ProfileRequests/></div></main>}
