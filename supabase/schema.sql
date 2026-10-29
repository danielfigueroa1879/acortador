-- =====================================================================
--  ACORTADOR DE ENLACES — Esquema Supabase
--  Ejecutar completo en: Supabase > SQL Editor > New query > Run
-- =====================================================================

-- gen_random_uuid() es nativo desde PostgreSQL 13 (Supabase ya lo incluye)

-- ---------------------------------------------------------------------
--  Tabla: links
-- ---------------------------------------------------------------------
create table if not exists public.links (
  id            uuid primary key default gen_random_uuid(),
  original_url  text not null,
  slug          text not null,
  expires_at    timestamptz,                 -- NULL = permanente
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),

  constraint links_slug_unique  unique (slug),
  constraint links_slug_format  check (slug ~ '^[A-Za-z0-9_-]{3,64}$'),
  constraint links_url_protocol check (original_url ~* '^https?://')
);

create index if not exists links_slug_idx       on public.links (slug);
create index if not exists links_created_at_idx on public.links (created_at desc);

-- ---------------------------------------------------------------------
--  Tabla: clicks
-- ---------------------------------------------------------------------
create table if not exists public.clicks (
  id           uuid primary key default gen_random_uuid(),
  link_id      uuid not null references public.links (id) on delete cascade,
  clicked_at   timestamptz not null default now(),
  ip_address   text,
  country      text,
  city         text,
  region       text,
  user_agent   text,
  device_type  text,        -- 'móvil' | 'desktop' | 'tablet' | 'bot'
  referrer     text
);

create index if not exists clicks_link_id_clicked_at_idx on public.clicks (link_id, clicked_at desc);
create index if not exists clicks_country_city_idx       on public.clicks (link_id, country, city);

-- ---------------------------------------------------------------------
--  Vista con estadísticas por enlace (usada por el dashboard /admin)
-- ---------------------------------------------------------------------
create or replace view public.link_stats
with (security_invoker = true) as
select
  l.id,
  l.original_url,
  l.slug,
  l.expires_at,
  l.is_active,
  l.created_at,
  count(c.id)::int                                        as total_clicks,
  count(c.id) filter (where c.device_type <> 'bot')::int  as human_clicks,
  max(c.clicked_at)                                       as last_click_at
from public.links l
left join public.clicks c on c.link_id = l.id
group by l.id;

-- ---------------------------------------------------------------------
--  Row Level Security
--  Todo el acceso pasa por el servidor de Next.js con la SERVICE ROLE
--  KEY (que ignora RLS). Los roles públicos (anon / authenticated) NO
--  pueden leer ni escribir nada: ni enlaces, ni IPs, ni ubicaciones.
-- ---------------------------------------------------------------------
alter table public.links  enable row level security;
alter table public.clicks enable row level security;

alter table public.links  force row level security;
alter table public.clicks force row level security;

-- Elimina políticas previas si re-ejecutas el script
drop policy if exists "deny_all_links_public"  on public.links;
drop policy if exists "deny_all_clicks_public" on public.clicks;

-- Políticas explícitas de denegación para roles públicos
create policy "deny_all_links_public" on public.links
  as restrictive for all to anon, authenticated
  using (false) with check (false);

create policy "deny_all_clicks_public" on public.clicks
  as restrictive for all to anon, authenticated
  using (false) with check (false);

-- Quitar privilegios directos a roles públicos (defensa en profundidad)
revoke all on public.links      from anon, authenticated;
revoke all on public.clicks     from anon, authenticated;
revoke all on public.link_stats from anon, authenticated;

-- La service_role mantiene acceso total
grant all on public.links      to service_role;
grant all on public.clicks     to service_role;
grant select on public.link_stats to service_role;
