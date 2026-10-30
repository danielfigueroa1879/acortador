// Autenticación simple por contraseña para el panel (/) y el dashboard (/admin).
// Compatible con Edge Runtime (middleware) y Node (route handlers): usa Web Crypto.

export const SESSION_COOKIE = 'acortador_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hash = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Token de sesión esperado. Cambia si cambias ADMIN_PASSWORD o SESSION_SECRET. */
export async function expectedSessionToken() {
  const pass = process.env.ADMIN_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!pass || !secret) return null;
  return sha256Hex(`acortador:v1:${pass}:${secret}`);
}

/** Comparación en tiempo constante */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function isValidSession(token) {
  const expected = await expectedSessionToken();
  if (!expected || !token) return false;
  return safeEqual(token, expected);
}

/**
 * Verificación real de sesión para Route Handlers (runtime Node, donde las
 * variables de entorno siempre están disponibles). Devuelve una Response 401
 * si no hay sesión válida, o null si está todo bien.
 */
export async function requireSession(request) {
  const token = request.cookies?.get?.(SESSION_COOKIE)?.value;
  if (await isValidSession(token)) return null;
  return new Response(JSON.stringify({ error: 'No autorizado' }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  });
}

export async function isValidPassword(password) {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass || typeof password !== 'string') return false;
  // Se comparan hashes para no filtrar el largo de la clave
  const [a, b] = await Promise.all([sha256Hex(password), sha256Hex(pass)]);
  return safeEqual(a, b);
}
