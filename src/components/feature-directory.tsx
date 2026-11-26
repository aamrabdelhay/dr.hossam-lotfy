'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { matchFeature } from '@/lib/feature-search-core';

type Item = {
  id: string;
  title: string;
  description: string;
  href: string;
  keywords: string[];
  group: string;
};

export function FeatureDirectory({ items }: { items: Item[] }) {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => {
    const grouped = new Map<string, Item[]>();
    for (const feature of items.filter((item) => matchFeature(item, query))) {
      grouped.set(feature.group, [...(grouped.get(feature.group) ?? []), feature]);
    }
    return [...grouped.entries()];
  }, [items, query]);

  return (
    <main dir="rtl" className="mx-auto w-full max-w-[1000px] px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-extrabold text-navy-950">كل مميزات الموقع</h1>
      <p className="mt-1 text-sm text-navy-400">ابحث عن ميزة أو إجراء، ثم افتح الصفحة المرتبطة به.</p>
      <label className="mt-5 flex items-center gap-2 rounded-2xl border border-navy-100 bg-white px-4 py-3 focus-within:border-gold-500">
        <Search size={18} className="shrink-0 text-gold-700" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="مثال: إضافة محامي، محكمة، تكليف مهمة"
          aria-label="ابحث في مميزات الموقع"
          className="w-full bg-transparent text-sm text-navy-900 outline-none"
        />
      </label>
      {groups.length === 0 && <p className="mt-8 text-center text-navy-400">لا توجد نتائج مطابقة.</p>}
      {groups.map(([group, features]) => (
        <section key={group} className="mt-7">
          <h2 className="mb-3 text-xs font-black tracking-[1.5px] text-gold-700">{group}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <li key={feature.id}>
                <Link href={feature.href} className="block rounded-2xl border border-navy-100 bg-white p-4 transition hover:border-gold-400 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500">
                  <span className="font-bold text-navy-950">{feature.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-navy-400">{feature.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
