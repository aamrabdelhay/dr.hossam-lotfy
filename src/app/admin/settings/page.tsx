import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';import { isSeniorManagement } from '@/lib/office-workflow';
import { AssistantSettings } from '@/components/admin/assistant-settings';
export const metadata:Metadata={title:'إعدادات النظام — الإدارة'};
export default async function SettingsPage(){const session=await getCurrentUser();if(!session)redirect('/auth');if(session.role!=='admin'&&!await isSeniorManagement(session))redirect('/admin/office');return <main className="mx-auto w-full max-w-[1000px] px-4 py-8 sm:px-6"><div className="mb-6"><h1 className="text-2xl font-extrabold text-navy-950">إعدادات النظام</h1><p className="mt-1 text-sm text-navy-400">إدارة تكاملات النظام والمساعد الذكي.</p></div><AssistantSettings/></main>}
