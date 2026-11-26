import type { Metadata } from 'next';
import { LibraryPanel } from '@/components/library-panel';
export const metadata: Metadata = { title: 'مكتبة السوابق والأحكام والمذكرات' };
export const dynamic = 'force-dynamic';
export default function LibraryPage() { return <LibraryPanel />; }
