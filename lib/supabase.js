import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase SOLO para el servidor (Route Handlers / Server Components).
 * Usa la SERVICE ROLE KEY: ignora RLS, por lo que jamás debe llegar al navegador.
 * El import 'server-only' hace fallar el build si algún componente cliente lo importa.
 */
let cached = null;

export function getSupabaseAdmin() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.'
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-application-name': 'acortador' } },
  });

  return cached;
}
