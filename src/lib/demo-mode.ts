import 'server-only';
import { cookies } from 'next/headers';

export const DEMO_COOKIE = 'hl_demo_mode';
export const DEMO_TAG = '(ديمو)';

export async function isDemoMode(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(DEMO_COOKIE)?.value === '1';
}

export function tagDemoText(value: string | null | undefined): string {
  if (!value) return value ?? '';
  return value.includes(DEMO_TAG) ? value : `${value} ${DEMO_TAG}`;
}

export function demoTextFilter(field: 'description' | 'name' | 'bio') {
  return { [field]: { contains: DEMO_TAG } } as Record<string, unknown>;
}
