import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { featuresFor } from '@/lib/feature-access';
import { FeatureDirectory } from '@/components/feature-directory';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'كل مميزات الموقع' };

export default async function FeaturesPage() {
  const session = await getCurrentUser();
  if (!session) redirect('/auth?next=%2Ffeatures');
  const items = (await featuresFor(session)).map(({ access: _access, ...feature }) => feature);
  return <FeatureDirectory items={items} />;
}
