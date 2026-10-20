import 'server-only';

import { ApiError } from '@/lib/api';

const PHOTO_REFERENCE_PATH = '/api/public/lawyer-photo';

export function isPrivateLawyerPhotoBlobUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.pathname.startsWith('/lawyer-photos/')) return false;

    const storeId = process.env.BLOB_STORE_ID?.trim().toLowerCase();
    if (!storeId) return false;

    // The Blob hostname may contain the API's "store_" prefix or its hostname form.
    const storeIds = new Set([storeId, storeId.replace(/^store_/, '')]);
    return Array.from(storeIds).some(
      (id) => id && url.hostname.toLowerCase() === `${id}.private.blob.vercel-storage.com`,
    );
  } catch {
    return false;
  }
}

export function lawyerPhotoReference(blobUrl: string): string {
  if (!isPrivateLawyerPhotoBlobUrl(blobUrl)) {
    throw new ApiError(500, 'تعذر تجهيز رابط صورة آمن من مخزن الملفات الخاص.');
  }
  return `${PHOTO_REFERENCE_PATH}?source=${encodeURIComponent(blobUrl)}`;
}

export function isValidLawyerPhotoReference(value: string): boolean {
  if (
    process.env.NODE_ENV !== 'production' &&
    /^\/uploads\/[a-f0-9]{24}\.(png|jpg|webp)$/.test(value)
  ) {
    return true;
  }

  if (!value.startsWith(`${PHOTO_REFERENCE_PATH}?`)) return false;
  try {
    const url = new URL(value, 'https://local.invalid');
    if (url.origin !== 'https://local.invalid' || url.pathname !== PHOTO_REFERENCE_PATH) return false;
    const source = url.searchParams.get('source');
    return !!source &&
      value === lawyerPhotoReference(source) &&
      isPrivateLawyerPhotoBlobUrl(source);
  } catch {
    return false;
  }
}
