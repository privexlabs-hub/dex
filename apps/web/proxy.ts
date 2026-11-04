import { NextResponse, type NextRequest } from 'next/server';

/**
 * Edge proxy (Next 16 name for middleware). Cheap cookie presence check only;
 * real session validation happens server-side in layouts/handlers. This exists
 * to redirect obviously signed-out users before rendering app routes.
 */
export function proxy(req: NextRequest) {
  const hasSession =
    req.cookies.has('dex.session_token') || req.cookies.has('__Secure-dex.session_token');
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = '/sign-in';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*', '/onboarding/:path*'] };
