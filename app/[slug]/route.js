import { NextResponse, after } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { resolveGeo } from '@/lib/geo';
import { RESERVED_SLUGS, SLUG_REGEX, linkStatus, parseUserAgent } from '@/lib/links';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function expiredRedirect(request, reason) {
  const url = new URL('/expired', request.url);
  url.searchParams.set('r', reason);
  const res = NextResponse.redirect(url, 307);
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

/** Registra el clic. Se ejecuta DESPUÉS de enviar la redirección (no la retrasa). */
async function trackClick(linkId, headers) {
  try {
    const userAgent = headers.get('user-agent') || '';
    const { device } = parseUserAgent(userAgent);
    const geo = await resolveGeo(headers);

    const { error } = await getSupabaseAdmin()
      .from('clicks')
      .insert({
        link_id: linkId,
        ip_address: geo.ip,
        country: geo.country,
        city: geo.city,
        region: geo.region,
        user_agent: userAgent.slice(0, 1000),
        device_type: device,
        referrer: (headers.get('referer') || '').slice(0, 1000) || null,
      });

    if (error) console.error('[tracking] error insertando clic:', error.message);
  } catch (e) {
    console.error('[tracking] fallo inesperado:', e);
  }
}

async function handle(request, { params }, { track }) {
  const { slug } = await params;

  if (!slug || !SLUG_REGEX.test(slug) || RESERVED_SLUGS.has(slug.toLowerCase())) {
    return expiredRedirect(request, 'notfound');
  }

  const { data: link, error } = await getSupabaseAdmin()
    .from('links')
    .select('id, original_url, is_active, expires_at')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('[redirect] error consultando slug:', error.message);
    return expiredRedirect(request, 'error');
  }
  if (!link) return expiredRedirect(request, 'notfound');

  const status = linkStatus(link);
  if (status !== 'active') return expiredRedirect(request, status);

  if (track) {
    // Copia de cabeceras: el objeto request no debe usarse tras responder
    const headers = new Headers(request.headers);
    after(() => trackClick(link.id, headers));
  }

  const res = NextResponse.redirect(link.original_url, 307);
  res.headers.set('Cache-Control', 'no-store, max-age=0');
  res.headers.set('X-Robots-Tag', 'noindex');
  return res;
}

export async function GET(request, ctx) {
  return handle(request, ctx, { track: true });
}

// HEAD (lo usan algunos verificadores de enlaces): redirige sin contar clic
export async function HEAD(request, ctx) {
  return handle(request, ctx, { track: false });
}
