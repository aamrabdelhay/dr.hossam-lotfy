import * as React from 'react';
import type { Metadata } from 'next';
import { SearchPageClient } from './search-client';

export const metadata: Metadata = { title: 'البحث' };

export default function SearchPage() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
      <React.Suspense
        fallback={
          <div className="flex h-40 items-center justify-center text-[13px] font-bold text-navy-300">جارٍ التحميل…</div>
        }
      >
        <SearchPageClient />
      </React.Suspense>
    </div>
  );
}
