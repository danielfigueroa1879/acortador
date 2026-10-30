import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';

/**
 * Filtro rápido de navegación: si no existe la cookie de sesión, manda a /login.
 * NO valida la firma aquí, porque en Netlify el middleware corre en Edge y puede
 * no tener acceso a ADMIN_PASSWORD / SESSION_SECRET.
 * La validación real se hace en cada ruta /api/links/* (runtime Node) con
 * requireSession(); sin sesión válida la API no entrega ni modifica nada.
 */
export function middleware(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) return NextResponse.next();

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
