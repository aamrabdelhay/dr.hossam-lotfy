import type { MetadataRoute } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dr-hossam-lotfy.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/uploads/', '/access/', '/notifications'],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
