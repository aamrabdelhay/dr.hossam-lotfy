import { ApiError, handle, json, user } from '@/lib/api';
import { dailyDigest } from '@/lib/notification-meta';
export const dynamic = 'force-dynamic';
export const GET = handle(async () => { const s = await user(); if (!s) throw new ApiError(401, 'سجّل الدخول أولاً'); return json(await dailyDigest(s)); });
