import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dr-hossam-lotfy.vercel.app';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = ['', '/locations', '/lawyers', '/calendar', '/sessions', '/search'].map((path) => ({
    url: `${SITE}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? ('daily' as const) : ('weekly' as const),
    priority: path === '' ? 1 : 0.7,
  }));

  try {
    const [locations, lawyers] = await Promise.all([
      prisma.location.findMany({ select: { slug: true, updatedAt: true }, take: 500 }),
      prisma.lawyer.findMany({ where: { active: true }, select: { slug: true, updatedAt: true }, take: 200 }),
    ]);
    return [
      ...staticRoutes,
      ...locations.map((l) => ({ url: `${SITE}/locations/${l.slug}`, lastModified: l.updatedAt, priority: 0.6 })),
      ...lawyers.map((l) => ({ url: `${SITE}/lawyers/${l.slug}`, lastModified: l.updatedAt, priority: 0.6 })),
    ];
  } catch {
    return staticRoutes;
  }
}
