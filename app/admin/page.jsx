'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Ban,
  Bot,
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Globe2,
  Infinity as InfinityIcon,
  Loader2,
  MapPin,
  Monitor,
  MousePointerClick,
  Play,
  RefreshCw,
  Search,
  Smartphone,
  Tablet,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import TopBar from '@/components/TopBar';
import { cleanOrigin, formatDateTime, formatRemaining, linkStatus, parseUserAgent } from '@/lib/links';

const STATUS_STYLE = {
  active: { label: 'Activo', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  expired: { label: 'Expirado', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  inactive: { label: 'Bloqueado', cls: 'border-rose-500/30 bg-rose-500/10 text-rose-300' },
};

const DEVICE_ICON = { 'móvil': Smartphone, desktop: Monitor, tablet: Tablet, bot: Bot };

const EXTEND_BUTTONS = [
  { value: '1h', label: '+1 h' },
  { value: '2h', label: '+2 h' },
  { value: '24h', label: '+24 h' },
  { value: '7d', label: '+7 d' },
  { value: 'never', label: 'Permanente' },
];

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function getBase() {
  if (process.env.NEXT_PUBLIC_BASE_URL) return cleanOrigin(process.env.NEXT_PUBLIC_BASE_URL);
  return typeof window !== 'undefined' ? cleanOrigin(window.location.origin) : '';
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, accent = 'text-cyan-400' }) {
  return (
    <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 sm:p-4">
      <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-500 sm:text-xs">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${accent}`} />
        <span className="truncate">{label}</span>
      </div>
      <div className="text-xl font-semibold tabular-nums text-zinc-100 sm:text-2xl">{value}</div>
    </div>
  );
}

function Bar({ value, max }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
      <div className="h-full rounded-full bg-cyan-500/80" style={{ width: `${pct}%` }} />
    </div>
  );
}

function toCsv(rows) {
  const cols = ['fecha_hora', 'ip', 'pais', 'region', 'ciudad', 'dispositivo', 'navegador', 'so', 'referrer', 'user_agent'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((c) => {
    const ua = parseUserAgent(c.user_agent);
    return [
      formatDateTime(c.clicked_at), c.ip_address, c.country, c.region, c.city,
      c.device_type, ua.browser, ua.os, c.referrer, c.user_agent,
    ].map(esc).join(';');
  });
  return '﻿' + [cols.join(';'), ...lines].join('\n');
}

// =====================================================================
//  Panel de analíticas de un enlace
// =====================================================================
function LinkDetail({ link, onClose, onChanged, onDeleted }) {
  const now = useNow(1000);
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [hideBots, setHideBots] = useState(true);
  const [copied, setCopied] = useState(false);

  const status = linkStatus(link, now);
  const shortUrl = `${getBase()}/${link.slug}`;

  const loadClicks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/links/${link.id}/clicks`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando clics');
      setClicks(data.clicks);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [link.id]);

  useEffect(() => {
    loadClicks();
  }, [loadClicks, link.total_clicks]);

  async function patch(body, key) {
    setBusy(key);
    setError('');
    try {
      const res = await fetch(`/api/links/${link.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error actualizando');
      onChanged(data.link);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  async function remove() {
    if (!confirm(`¿Eliminar definitivamente /${link.slug} y todo su historial de clics?`)) return;
    setBusy('delete');
    try {
      const res = await fetch(`/api/links/${link.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error eliminando');
      onDeleted(link.id);
    } catch (e) {
      setError(e.message);
      setBusy('');
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(shortUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function exportCsv() {
    const blob = new Blob([toCsv(visible)], { type: 'text/csv;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `clics-${link.slug}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

  const visible = useMemo(
    () => (hideBots ? clicks.filter((c) => c.device_type !== 'bot') : clicks),
    [clicks, hideBots]
  );

  const stats = useMemo(() => {
    const countries = new Map();
    const devices = new Map();
    const ips = new Set();
    for (const c of visible) {
      const country = c.country || 'Desconocido';
      const city = c.city || 'Ciudad desconocida';
      if (!countries.has(country)) countries.set(country, { total: 0, cities: new Map() });
      const entry = countries.get(country);
      entry.total++;
      entry.cities.set(city, (entry.cities.get(city) || 0) + 1);
      const d = c.device_type || 'desconocido';
      devices.set(d, (devices.get(d) || 0) + 1);
      if (c.ip_address) ips.add(c.ip_address);
    }
    const countryList = [...countries.entries()]
      .map(([name, v]) => ({
        name,
        total: v.total,
        cities: [...v.cities.entries()].map(([n, t]) => ({ name: n, total: t })).sort((a, b) => b.total - a.total),
      }))
      .sort((a, b) => b.total - a.total);
    const deviceList = [...devices.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
    return {
      countryList,
      deviceList,
      uniqueIps: ips.size,
      bots: clicks.filter((c) => c.device_type === 'bot').length,
    };
  }, [visible, clicks]);

  // Datos derivados por fila, compartidos por la vista de tarjetas y la tabla
  const rows = useMemo(
    () =>
      visible.map((c) => {
        let ref = 'Directo';
        if (c.referrer) {
          try { ref = new URL(c.referrer).hostname; } catch { ref = c.referrer; }
        }
        return {
          ...c,
          ref,
          ua: parseUserAgent(c.user_agent),
          Icon: DEVICE_ICON[c.device_type] || Monitor,
          place: [c.city, c.region, c.country].filter(Boolean).join(', ') || '—',
        };
      }),
    [visible]
  );

  const maxCountry = stats.countryList[0]?.total || 0;
  const maxDevice = stats.deviceList[0]?.total || 0;

  return (
    <>
    <div className="min-w-0 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:space-y-5 sm:p-5 lg:col-span-7">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <StatusBadge status={status} />
            <span className="text-xs text-zinc-500">Creado {formatDateTime(link.created_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <h2 className="mono truncate text-lg font-semibold text-zinc-100 sm:text-xl">/{link.slug}</h2>
            <button onClick={copy} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-cyan-400" title="Copiar URL corta">
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <a
            href={link.original_url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 flex items-center gap-1 truncate text-sm text-zinc-400 hover:text-cyan-300"
            title={link.original_url}
          >
            <span className="truncate">{link.original_url}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Controles */}
      <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <Clock className="h-4 w-4 text-zinc-500" />
            <span className="text-zinc-400">Tiempo restante:</span>
            <span className="mono font-medium text-zinc-100">
              {link.expires_at ? formatRemaining(link.expires_at, now) : 'Permanente'}
            </span>
            {link.expires_at && (
              <span className="hidden text-xs text-zinc-600 sm:inline">({formatDateTime(link.expires_at)})</span>
            )}
          </div>
          <div className="flex gap-2">
            {link.is_active ? (
              <button
                onClick={() => patch({ is_active: false }, 'toggle')}
                disabled={!!busy}
                className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-sm text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
              >
                {busy === 'toggle' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                Bloquear
              </button>
            ) : (
              <button
                onClick={() => patch({ is_active: true }, 'toggle')}
                disabled={!!busy}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
              >
                {busy === 'toggle' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Reactivar
              </button>
            )}
            <button
              onClick={remove}
              disabled={!!busy}
              className="rounded-lg border border-zinc-700 p-1.5 text-zinc-500 transition hover:border-rose-500/50 hover:text-rose-400 disabled:opacity-50"
              title="Eliminar enlace"
            >
              {busy === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-zinc-500">Extender:</span>
          {EXTEND_BUTTONS.map((b) => (
            <button
              key={b.value}
              onClick={() => patch({ extend: b.value }, `ext-${b.value}`)}
              disabled={!!busy}
              className="flex items-center gap-1 rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-cyan-500/60 hover:text-cyan-300 disabled:opacity-50"
            >
              {busy === `ext-${b.value}` && <Loader2 className="h-3 w-3 animate-spin" />}
              {b.value === 'never' && busy !== 'ext-never' && <InfinityIcon className="h-3 w-3" />}
              {b.label}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-rose-400">{error}</p>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <StatCard icon={MousePointerClick} label="Clics" value={visible.length} />
        <StatCard icon={Users} label="IPs únicas" value={stats.uniqueIps} accent="text-violet-400" />
        <StatCard icon={Globe2} label="Países" value={stats.countryList.length} accent="text-emerald-400" />
        <StatCard icon={Bot} label="Bots / previews" value={stats.bots} accent="text-amber-400" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={hideBots}
            onChange={(e) => setHideBots(e.target.checked)}
            className="h-4 w-4 accent-cyan-500"
          />
          Ocultar bots<span className="hidden sm:inline"> (vistas previas de WhatsApp, Telegram, etc.)</span>
        </label>
        <div className="flex gap-2">
          <button
            onClick={loadClicks}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </button>
          <button
            onClick={exportCsv}
            disabled={!visible.length}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> CSV
          </button>
        </div>
      </div>

      {loading && !clicks.length ? (
        <div className="flex items-center justify-center py-16 text-zinc-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando analíticas…
        </div>
      ) : (
        <>
          {/* Geografía + dispositivos */}
          <div className="grid gap-4 md:grid-cols-5">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 sm:p-4 md:col-span-3">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-200">
                <MapPin className="h-4 w-4 text-cyan-400" /> Desglose geográfico
              </h3>
              {stats.countryList.length === 0 ? (
                <p className="text-sm text-zinc-600">Sin visitas registradas.</p>
              ) : (
                <ul className="scroll-thin max-h-80 space-y-4 overflow-y-auto pr-1">
                  {stats.countryList.map((c) => (
                    <li key={c.name}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-zinc-200">{c.name}</span>
                        <span className="mono tabular-nums text-zinc-400">
                          {c.total}{' '}
                          <span className="text-zinc-600">
                            ({Math.round((c.total / visible.length) * 100)}%)
                          </span>
                        </span>
                      </div>
                      <Bar value={c.total} max={maxCountry} />
                      <ul className="mt-2 space-y-1 border-l border-zinc-800 pl-3">
                        {c.cities.map((city) => (
                          <li key={city.name} className="flex justify-between text-xs text-zinc-400">
                            <span>{city.name}</span>
                            <span className="mono tabular-nums">{city.total}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 sm:p-4 md:col-span-2">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-200">
                <Activity className="h-4 w-4 text-violet-400" /> Dispositivos
              </h3>
              {stats.deviceList.length === 0 ? (
                <p className="text-sm text-zinc-600">Sin datos.</p>
              ) : (
                <ul className="space-y-3">
                  {stats.deviceList.map((d) => {
                    const Icon = DEVICE_ICON[d.name] || Monitor;
                    return (
                      <li key={d.name}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 capitalize text-zinc-300">
                            <Icon className="h-3.5 w-3.5 text-zinc-500" /> {d.name}
                          </span>
                          <span className="mono tabular-nums text-zinc-400">{d.total}</span>
                        </div>
                        <Bar value={d.total} max={maxDevice} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>

    {/* Historial: ocupa todo el ancho, debajo de la lista y el detalle */}
    {!(loading && !clicks.length) && (
      <div className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/50 lg:col-span-12">
        <h3 className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-200">
          <Clock className="h-4 w-4 text-emerald-400" /> Historial de clics
          <span className="text-xs font-normal text-zinc-500">({visible.length})</span>
        </h3>
        {visible.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-600">Aún no hay clics.</p>
        ) : (
          <>
            {/* Celulares y tablets: tarjetas */}
            <ul className="scroll-thin max-h-[70dvh] divide-y divide-zinc-800/70 overflow-y-auto lg:hidden">
              {rows.map((c) => (
                <li key={c.id} className="space-y-1.5 px-4 py-3 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:space-y-0 sm:gap-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="mono text-xs text-zinc-300">{formatDateTime(c.clicked_at)}</span>
                    <span className="flex shrink-0 items-center gap-1 text-xs capitalize text-zinc-400">
                      <c.Icon className="h-3.5 w-3.5 text-zinc-500" /> {c.device_type || '—'}
                    </span>
                  </div>
                  <p className="flex items-start gap-1.5 text-sm text-zinc-200">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
                    <span>{c.place}</span>
                  </p>
                  <p className="mono break-all text-xs text-zinc-500">{c.ip_address || '—'}</p>
                  <p className="text-xs text-zinc-500">
                    {c.ua.browser} / {c.ua.os} · <span className="break-all">{c.ref}</span>
                  </p>
                </li>
              ))}
            </ul>

            {/* Escritorio: tabla */}
            <div className="scroll-thin hidden max-h-[70vh] overflow-auto lg:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="sticky top-0 bg-zinc-950 text-xs uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Fecha y hora</th>
                    <th className="px-4 py-2 font-medium">IP</th>
                    <th className="px-4 py-2 font-medium">Ubicación</th>
                    <th className="px-4 py-2 font-medium">Dispositivo</th>
                    <th className="px-4 py-2 font-medium">Origen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {rows.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-900/60">
                      <td className="mono whitespace-nowrap px-4 py-2 text-xs text-zinc-300">
                        {formatDateTime(c.clicked_at)}
                      </td>
                      <td className="mono whitespace-nowrap px-4 py-2 text-xs text-zinc-400">
                        {c.ip_address || '—'}
                      </td>
                      <td className="px-4 py-2 text-zinc-300">{c.place}</td>
                      <td className="px-4 py-2" title={c.user_agent || ''}>
                        <span className="flex flex-wrap items-center gap-x-1.5 text-zinc-300">
                          <c.Icon className="h-3.5 w-3.5 text-zinc-500" />
                          <span className="capitalize">{c.device_type || '—'}</span>
                          <span className="text-xs text-zinc-500">· {c.ua.browser} / {c.ua.os}</span>
                        </span>
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-2 text-xs text-zinc-500" title={c.referrer || ''}>
                        {c.ref}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    )}
    </>
  );
}

// =====================================================================
//  Página principal del dashboard
// =====================================================================
export default function AdminPage() {
  const now = useNow(1000);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/links', { cache: 'no-store' });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando enlaces');
      setLinks(data.links);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 30000); // refresco automático
    return () => clearInterval(t);
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return links.filter((l) => {
      if (filter !== 'all' && linkStatus(l, now) !== filter) return false;
      if (!q) return true;
      return l.slug.toLowerCase().includes(q) || l.original_url.toLowerCase().includes(q);
    });
  }, [links, query, filter, now]);

  const totals = useMemo(() => {
    let active = 0;
    let clicks = 0;
    for (const l of links) {
      if (linkStatus(l, now) === 'active') active++;
      clicks += l.human_clicks ?? l.total_clicks ?? 0;
    }
    return { total: links.length, active, clicks };
  }, [links, now]);

  const selected = links.find((l) => l.id === selectedId) || null;

  function onChanged(updated) {
    setLinks((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
  }
  function onDeleted(id) {
    setLinks((prev) => prev.filter((l) => l.id !== id));
    setSelectedId(null);
  }

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6 sm:gap-4">
          <div>
            <p className="mono mb-1 text-xs uppercase tracking-[0.25em] text-cyan-400/80">Monitoreo</p>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">Dashboard de enlaces</h1>
          </div>
          <div className="flex gap-4 text-sm sm:gap-6">
            <div><span className="text-zinc-500">Enlaces </span><span className="font-semibold tabular-nums text-zinc-100">{totals.total}</span></div>
            <div><span className="text-zinc-500">Activos </span><span className="font-semibold tabular-nums text-emerald-300">{totals.active}</span></div>
            <div><span className="text-zinc-500">Clics </span><span className="font-semibold tabular-nums text-cyan-300">{totals.clicks}</span></div>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
          {/* ----- Lista ----- */}
          <section className={`min-w-0 lg:col-span-5 ${selected ? 'hidden lg:block' : ''}`}>
            <div className="mb-3 flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar alias o URL…"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-3 text-base text-zinc-100 sm:text-sm placeholder-zinc-600 outline-none focus:border-cyan-500"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-base text-zinc-200 outline-none focus:border-cyan-500 sm:px-3 sm:text-sm"
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="expired">Expirados</option>
                <option value="inactive">Bloqueados</option>
              </select>
              <button
                onClick={() => load()}
                className="rounded-lg border border-zinc-800 px-3 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                title="Actualizar"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {error && (
              <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
            )}

            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
              {loading && !links.length ? (
                <div className="flex items-center justify-center py-16 text-zinc-500">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando…
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-16 text-center text-sm text-zinc-600">No hay enlaces que coincidan.</p>
              ) : (
                <ul className="scroll-thin max-h-[calc(100dvh-15rem)] divide-y divide-zinc-800/80 overflow-y-auto">
                  {filtered.map((l) => {
                    const st = linkStatus(l, now);
                    const isSel = l.id === selectedId;
                    return (
                      <li key={l.id}>
                        <button
                          onClick={() => setSelectedId(l.id)}
                          className={`w-full px-4 py-3 text-left transition ${
                            isSel ? 'bg-cyan-500/10' : 'hover:bg-zinc-900/80'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className={`mono truncate font-medium ${isSel ? 'text-cyan-300' : 'text-zinc-100'}`}>
                              /{l.slug}
                            </span>
                            <StatusBadge status={st} />
                          </div>
                          <p className="mt-0.5 truncate text-xs text-zinc-500">{l.original_url}</p>
                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-zinc-500">{formatDateTime(l.created_at)}</span>
                            <span className="flex items-center gap-3">
                              <span className="mono flex items-center gap-1 text-zinc-400">
                                <Clock className="h-3 w-3" />
                                {st === 'inactive' ? '—' : formatRemaining(l.expires_at, now)}
                              </span>
                              <span className="mono flex items-center gap-1 text-cyan-300">
                                <MousePointerClick className="h-3 w-3" />
                                {l.human_clicks ?? l.total_clicks}
                              </span>
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* ----- Detalle ----- */}
          {/* Con un enlace seleccionado la sección se "disuelve" (display: contents) para que
              el detalle y el historial se ubiquen directamente en la grilla. */}
          <section className={selected ? 'contents' : 'hidden lg:col-span-7 lg:block'}>
            {selected ? (
              <LinkDetail
                key={selected.id}
                link={selected}
                onClose={() => setSelectedId(null)}
                onChanged={onChanged}
                onDeleted={onDeleted}
              />
            ) : (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 text-center">
                <Activity className="mb-3 h-8 w-8 text-zinc-700" />
                <p className="text-sm text-zinc-500">Selecciona un enlace para ver sus analíticas.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
