import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { EXPIRATION_OPTIONS } from '@/lib/links';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PATCH /api/links/:id
 * Body (cualquiera de):
 *  { is_active: boolean }                 → activar / bloquear
 *  { extend: '1h'|'2h'|'24h'|'7d' }       → suma tiempo (desde ahora si ya expiró)
 *  { extend: 'never' }                    → lo deja permanente
 */
export async function PATCH(request, { params }) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const update = {};

  if (typeof body?.is_active === 'boolean') update.is_active = body.is_active;

  if (body?.extend) {
    const opt = EXPIRATION_OPTIONS.find((o) => o.value === body.extend);
    if (!opt) return NextResponse.json({ error: 'Extensión inválida' }, { status: 400 });

    if (opt.ms === null) {
      update.expires_at = null;
    } else {
      const { data: current, error } = await supabase
        .from('links')
        .select('expires_at')
        .eq('id', id)
        .single();
      if (error) return NextResponse.json({ error: 'Enlace no encontrado' }, { status: 404 });

      const now = Date.now();
      const currentMs = current.expires_at ? new Date(current.expires_at).getTime() : null;
      // Permanente + extender => pasa a expirar en ese plazo desde ahora
      const baseMs = currentMs && currentMs > now ? currentMs : now;
      update.expires_at = new Date(baseMs + opt.ms).toISOString();
    }
    // Extender implica reactivar
    if (typeof body?.is_active !== 'boolean') update.is_active = true;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
  }

  const { data, error } = await supabase.from('links').update(update).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ link: data });
}

// DELETE /api/links/:id → elimina enlace y sus clics (ON DELETE CASCADE)
export async function DELETE(_request, { params }) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('links').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
