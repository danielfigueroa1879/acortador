import { NextResponse } from 'next/server';
import { SESSION_COOKIE, isValidSession } from '@/lib/auth';

/**
 * Protege el generador (/), el dashboard (/admin) y la API de gestión.
 * Los enlaces cortos (/[slug]) y /expired quedan públicos.
 */
export async function middleware(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await isValidSession(token)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/', '/admin', '/admin/:path*', '/api/links', '/api/links/:path*'],
};
