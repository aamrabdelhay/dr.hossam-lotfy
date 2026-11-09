import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'hlsession';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicPage = pathname === '/auth' || pathname === '/training';

  // Reject anonymous page requests before rendering. The root layout still
  // validates the signed session and its database record, so a forged,
  // expired, or revoked cookie never grants access.
  if (!isPublicPage && !request.cookies.has(SESSION_COOKIE)) {
    const destination = request.nextUrl.clone();
    const nextPath = pathname + request.nextUrl.search;
    destination.pathname = '/auth';
    destination.search = '';
    destination.searchParams.set('next', nextPath);
    return NextResponse.redirect(destination);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // API routes enforce their own session and role checks. Static assets must
  // remain loadable on the public sign-in and training pages.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\..*).*)'],
};