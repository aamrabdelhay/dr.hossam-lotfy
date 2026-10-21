import type { MetadataRoute } from 'next';

function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://dr-hossam-lotfy-hw88.vercel.app';
  const withProtocol = /^https?:\/\//i.test(configured) ? configured : `https://${configured}`;
  return withProtocol.replace(/\/+$/, '');
}

const SITE = getSiteUrl();

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
