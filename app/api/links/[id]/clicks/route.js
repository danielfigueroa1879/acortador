import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE = 1000;
const MAX_ROWS = 10000;

// GET /api/links/:id/clicks → historial completo de clics (más reciente primero)
export async function GET(_request, { params }) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const rows = [];

  // Supabase limita a 1000 filas por consulta: se pagina
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await supabase
      .from('clicks')
      .select('id, clicked_at, ip_address, country, city, region, user_agent, device_type, referrer')
      .eq('link_id', id)
      .order('clicked_at', { ascending: false })
      .range(from, from + PAGE - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    rows.push(...data);
    if (data.length < PAGE) break;
  }

  return NextResponse.json({ clicks: rows, truncated: rows.length >= MAX_ROWS });
}
