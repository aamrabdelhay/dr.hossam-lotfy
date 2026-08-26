'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { Button } from './ui';

export function FeedMore({ currentQuery }: { nextPage?: number; currentQuery: string }) {
  return (
    <div className="flex justify-center pt-2">
      <Link href={`/?${currentQuery}`}>
        <Button variant="outline" className="w-full max-w-xs">
          <ChevronDown size={15} />
          عرض المزيد
        </Button>
      </Link>
    </div>
  );
}
