import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  expectedSessionToken,
  isValidPassword,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/login { password }
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  if (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET) {
    return NextResponse.json(
      { error: 'Configura ADMIN_PASSWORD y SESSION_SECRET en las variables de entorno' },
      { status: 500 }
    );
  }

  if (!(await isValidPassword(body?.password))) {
    // Pequeño retardo para frenar fuerza bruta
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await expectedSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}

// DELETE /api/login → cerrar sesión
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
