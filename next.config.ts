/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== 'production';

const s3ConnectOrigin = process.env.S3_BUCKET_NAME && process.env.AWS_REGION
  ? 'https://' + process.env.S3_BUCKET_NAME + '.s3.' + process.env.AWS_REGION + '.amazonaws.com'
  : null;

/**
 * Content-Security-Policy: Next.js needs 'unsafe-inline' for its bootstrap
 * <script> payloads unless a nonce-middleware is used; styles come from
 * self + Google Fonts (@import). Everything else is locked to 'self'.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://translate.google.com https://translate.googleapis.com${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://translate.google.com https://translate.googleapis.com https://translate-pa.googleapis.com https://*.private.blob.vercel-storage.com" + (s3ConnectOrigin ? " " + s3ConnectOrigin : ""),
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]),
];

const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
