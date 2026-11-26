import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { OfficeLiveScreen } from '@/components/office-live-screen';
import { getCurrentUser } from '@/lib/auth';
import { canSeeOfficeLive, getOfficeLive } from '@/lib/office-live';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'شاشة المكتب الحية' };

export default async function OfficeLivePage() {
  const session = await getCurrentUser();
  if (!session) redirect('/auth?next=%2Fadmin%2Foffice%2Flive');
  if (!(await canSeeOfficeLive(session))) redirect('/');
  const initial = await getOfficeLive(session);
  return <OfficeLiveScreen initial={initial} />;
}
