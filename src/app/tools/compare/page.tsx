import type { Metadata } from 'next';
import { TextCompare } from '@/components/text-compare';
export const metadata: Metadata = { title: 'مقارنة نصوص المستندات' };
export const dynamic = 'force-dynamic';
export default function Page() { return <TextCompare />; }
