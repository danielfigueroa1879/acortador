import 'server-only';

/**
 * Geolocalización por IP.
 * 1) Cabeceras del hosting (Netlify: x-nf-geo / Vercel: x-vercel-ip-*)  → sin latencia
 * 2) Respaldo: ip-api.com (lang=es) y luego ipapi.co                     → si faltan datos
 */

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(['es'], { type: 'region' });
  } catch {
    return null;
  }
})();

function countryName(code) {
  if (!code) return null;
  const c = String(code).toUpperCase();
  if (c.length !== 2) return code;
  try {
    return regionNames?.of(c) || c;
  } catch {
    return c;
  }
}

function safeDecode(v) {
  if (!v) return null;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export function getClientIp(headers) {
  const candidates = [
    headers.get('x-nf-client-connection-ip'), // Netlify
    headers.get('x-vercel-forwarded-for'),     // Vercel
    headers.get('cf-connecting-ip'),           // Cloudflare
    headers.get('x-real-ip'),
    headers.get('x-forwarded-for')?.split(',')[0],
  ];
  for (const c of candidates) {
    const ip = c?.trim();
    if (ip) return ip.replace(/^::ffff:/, '');
  }
  return null;
}

export function isPrivateIp(ip) {
  if (!ip) return true;
  return (
    ip === '::1' ||
    ip === '127.0.0.1' ||
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    /^169\.254\./.test(ip) ||
    /^f[cd][0-9a-f]{2}:/i.test(ip) ||
    /^fe80:/i.test(ip)
  );
}

function geoFromNetlify(headers) {
  const raw = headers.get('x-nf-geo');
  if (!raw) return null;
  let data = null;
  try {
    data = JSON.parse(raw);
  } catch {
    try {
      data = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    } catch {
      return null;
    }
  }
  if (!data) return null;
  return {
    country: countryName(data.country?.code) || data.country?.name || null,
    region: data.subdivision?.name || data.subdivision?.code || null,
    city: data.city || null,
  };
}

function geoFromVercel(headers) {
  const code = headers.get('x-vercel-ip-country');
  if (!code) return null;
  return {
    country: countryName(code),
    region: safeDecode(headers.get('x-vercel-ip-country-region')),
    city: safeDecode(headers.get('x-vercel-ip-city')),
  };
}

function geoFromCloudflare(headers) {
  const code = headers.get('cf-ipcountry');
  if (!code || code === 'XX') return null;
  return {
    country: countryName(code),
    region: safeDecode(headers.get('cf-region')),
    city: safeDecode(headers.get('cf-ipcity')),
  };
}

async function fetchJson(url, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { accept: 'application/json', 'user-agent': 'acortador/1.0' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function geoFromApis(ip) {
  // ip-api.com: gratis, 45 req/min, solo HTTP en plan free, soporta español
  const a = await fetchJson(
    `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode,country,regionName,city&lang=es`,
    2000
  );
  if (a && a.status === 'success') {
    return {
      country: countryName(a.countryCode) || a.country || null,
      region: a.regionName || null,
      city: a.city || null,
    };
  }

  // ipapi.co: gratis, HTTPS, ~1000 req/día
  const b = await fetchJson(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, 2000);
  if (b && !b.error) {
    return {
      country: countryName(b.country_code) || b.country_name || null,
      region: b.region || null,
      city: b.city || null,
    };
  }
  return null;
}

/** Devuelve { ip, country, region, city } con el mejor dato disponible. */
export async function resolveGeo(headers) {
  const ip = getClientIp(headers);

  if (isPrivateIp(ip)) {
    return { ip, country: 'Local', region: null, city: 'Red local' };
  }

  const fromHost = geoFromNetlify(headers) || geoFromVercel(headers) || geoFromCloudflare(headers);
  if (fromHost?.country && fromHost?.city) return { ip, ...fromHost };

  if (process.env.GEOIP_FALLBACK !== 'false' && ip) {
    const fromApi = await geoFromApis(ip);
    if (fromApi) {
      return {
        ip,
        country: fromHost?.country || fromApi.country,
        region: fromHost?.region || fromApi.region,
        city: fromHost?.city || fromApi.city,
      };
    }
  }

  return {
    ip,
    country: fromHost?.country || 'Desconocido',
    region: fromHost?.region || null,
    city: fromHost?.city || null,
  };
}
