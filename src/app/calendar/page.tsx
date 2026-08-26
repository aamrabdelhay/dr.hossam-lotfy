import type { Metadata } from 'next';
import { CalendarClient } from './calendar-client';

export const metadata: Metadata = { title: 'التقويم' };

export default function CalendarPage() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
      <CalendarClient />
    </div>
  );
}
