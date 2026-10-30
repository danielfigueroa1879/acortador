// Utilidades compartidas (servidor y cliente) — sin dependencias de Node.

export const EXPIRATION_OPTIONS = [
  { value: '1h', label: '1 hora', ms: 60 * 60 * 1000 },
  { value: '2h', label: '2 horas', ms: 2 * 60 * 60 * 1000 },
  { value: '24h', label: '24 horas', ms: 24 * 60 * 60 * 1000 },
  { value: '7d', label: '7 días', ms: 7 * 24 * 60 * 60 * 1000 },
  { value: 'never', label: 'Sin expiración', ms: null },
];

// Rutas propias de la app que no pueden usarse como alias
export const RESERVED_SLUGS = new Set([
  'admin', 'api', 'expired', 'login', 'logout', '_next', 'favicon.ico',
  'robots.txt', 'sitemap.xml', 'static', 'public',
]);

/**
 * Quita el prefijo de deploy de Netlify (ej. "6ae49f...--acortad.netlify.app"
 * o "main--acortad.netlify.app") para usar siempre el dominio principal.
 */
export function cleanOrigin(origin) {
  if (!origin) return origin;
  return origin.replace(/\/+$/, '').replace(/^(https?:\/\/)[A-Za-z0-9-]+--(?=[A-Za-z0-9-]+\.netlify\.app$)/, '$1');
}

export const SLUG_REGEX = /^[A-Za-z0-9_-]{3,64}$/;

const SLUG_ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Slug aleatorio criptográficamente seguro (sin caracteres ambiguos 0/O, 1/l/I). */
export function generateSlug(length = 6) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) out += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
  return out;
}

/** Calcula expires_at (ISO) a partir de la opción elegida. null = permanente. */
export function computeExpiresAt(option, from = Date.now()) {
  const opt = EXPIRATION_OPTIONS.find((o) => o.value === option);
  if (!opt) throw new Error('Opción de expiración inválida');
  return opt.ms === null ? null : new Date(from + opt.ms).toISOString();
}

/** Normaliza y valida una URL destino. Solo http/https. */
export function normalizeUrl(raw) {
  if (typeof raw !== 'string') return null;
  let value = raw.trim();
  if (!value) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = `https://${value}`;
  try {
    const u = new URL(value);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!u.hostname || !u.hostname.includes('.')) {
      if (u.hostname !== 'localhost') return null;
    }
    return u.toString();
  } catch {
    return null;
  }
}

/** Estado de un enlace: 'active' | 'expired' | 'inactive' */
export function linkStatus(link, now = Date.now()) {
  if (!link.is_active) return 'inactive';
  if (link.expires_at && new Date(link.expires_at).getTime() <= now) return 'expired';
  return 'active';
}

/** Texto legible del tiempo restante */
export function formatRemaining(expiresAt, now = Date.now()) {
  if (!expiresAt) return 'Permanente';
  let diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return 'Expirado';
  const d = Math.floor(diff / 86400000); diff -= d * 86400000;
  const h = Math.floor(diff / 3600000); diff -= h * 3600000;
  const m = Math.floor(diff / 60000); diff -= m * 60000;
  const s = Math.floor(diff / 1000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'America/Santiago',
  }).format(new Date(iso));
}

// ---------------------------------------------------------------------
//  Parser ligero de User-Agent (sin dependencias)
// ---------------------------------------------------------------------
const BOT_REGEX =
  /bot|crawl|spider|slurp|facebookexternalhit|facebot|whatsapp|telegrambot|twitterbot|linkedinbot|discordbot|slackbot|skypeuripreview|embedly|preview|curl|wget|python-requests|httpclient|go-http-client|okhttp|headless|lighthouse|pingdom|uptime/i;

export function parseUserAgent(ua = '') {
  const s = ua || '';
  let device = 'desktop';
  if (!s) device = 'desconocido';
  else if (BOT_REGEX.test(s)) device = 'bot';
  else if (/ipad|tablet|playbook|silk|kindle|(android(?!.*mobile))/i.test(s)) device = 'tablet';
  else if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|iemobile/i.test(s)) device = 'móvil';
  // iPadOS 13+ se reporta como Macintosh; se detecta en cliente, no aquí.

  let browser = 'Otro';
  if (/edg\//i.test(s)) browser = 'Edge';
  else if (/opr\/|opera/i.test(s)) browser = 'Opera';
  else if (/samsungbrowser/i.test(s)) browser = 'Samsung Internet';
  else if (/fbav|fban|instagram/i.test(s)) browser = 'App Meta';
  else if (/whatsapp/i.test(s)) browser = 'WhatsApp';
  else if (/firefox|fxios/i.test(s)) browser = 'Firefox';
  else if (/crios|chrome\//i.test(s)) browser = 'Chrome';
  else if (/safari/i.test(s)) browser = 'Safari';

  let os = 'Otro';
  if (/windows nt/i.test(s)) os = 'Windows';
  else if (/iphone|ipad|ipod/i.test(s)) os = 'iOS';
  else if (/android/i.test(s)) os = 'Android';
  else if (/mac os x|macintosh/i.test(s)) os = 'macOS';
  else if (/cros/i.test(s)) os = 'ChromeOS';
  else if (/linux/i.test(s)) os = 'Linux';

  return { device, browser, os };
}
