import type { Metadata } from 'next';
import { ImageRedactor } from '@/components/image-redactor';
export const metadata: Metadata = { title: 'إخفاء البيانات الحساسة' };
export const dynamic = 'force-dynamic';
export default function Page() { return <ImageRedactor />; }
