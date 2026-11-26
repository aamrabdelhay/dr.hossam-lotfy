import type { Metadata } from 'next';
import { DirectoryPanel } from '@/components/directory-panel';
import { TranslationMemoryPanel } from '@/components/translation-memory-panel';
export const metadata: Metadata = { title: 'دليل الخبراء والمترجمين' };
export const dynamic = 'force-dynamic';
export default function DirectoryPage() { return <><DirectoryPanel /><TranslationMemoryPanel /></>; }
