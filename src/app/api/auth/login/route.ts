import { NextResponse, type NextRequest } from 'next/server';
import { POST as adminCodeLogin } from '../admin/route';

/**
 * Legacy entry point. The old "press the key" auto-login no longer exists:
 *  - GET  → the unified auth hub (/auth) where the admin enters the code.
 *  - POST → alias of the admin code login (kept for backwards compatibility).
 */
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/auth', req.url));
}

export const POST = adminCodeLogin;
