import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  RESERVED_SLUGS,
  SLUG_REGEX,
  computeExpiresAt,
  generateSlug,
  normalizeUrl,
} from '@/lib/links';

export const dynamic = 'force-dynamic';

function baseUrl(request) {
  return (process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin).replace(/\/+$/, '');
}

// GET /api/links → lista de enlaces con contador de clics
export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('link_stats')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ links: data });
}

// POST /api/links → crear enlace { url, alias?, expiration }
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 });
  }

  const originalUrl = normalizeUrl(body?.url);
  if (!originalUrl) {
    return NextResponse.json({ error: 'URL inválida. Debe ser http:// o https://' }, { status: 400 });
  }

  const base = baseUrl(request);
  if (originalUrl.startsWith(base + '/')) {
    return NextResponse.json({ error: 'No se puede acortar un enlace de este mismo dominio' }, { status: 400 });
  }

  let expiresAt;
  try {
    expiresAt = computeExpiresAt(body?.expiration || 'never');
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const alias = typeof body?.alias === 'string' ? body.alias.trim() : '';

  // Alias personalizado
  if (alias) {
    if (!SLUG_REGEX.test(alias)) {
      return NextResponse.json(
        { error: 'Alias inválido: 3 a 64 caracteres, solo letras, números, "-" y "_"' },
        { status: 400 }
      );
    }
    if (RESERVED_SLUGS.has(alias.toLowerCase())) {
      return NextResponse.json({ error: `"${alias}" es una ruta reservada` }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('links')
      .insert({ original_url: originalUrl, slug: alias, expires_at: expiresAt })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: `El alias "${alias}" ya está en uso` }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ link: data, short_url: `${base}/${data.slug}` }, { status: 201 });
  }

  // Slug aleatorio (reintenta ante colisión)
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = generateSlug(6);
    const { data, error } = await supabase
      .from('links')
      .insert({ original_url: originalUrl, slug, expires_at: expiresAt })
      .select()
      .single();

    if (!error) {
      return NextResponse.json({ link: data, short_url: `${base}/${data.slug}` }, { status: 201 });
    }
    if (error.code !== '23505') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'No se pudo generar un slug único, intenta de nuevo' }, { status: 500 });
}
