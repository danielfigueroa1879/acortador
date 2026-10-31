'use client';

import { useRef, useState } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import {
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Link2,
  Loader2,
  RefreshCw,
  Sparkles,
  Wand2,
} from 'lucide-react';
import TopBar from '@/components/TopBar';
import { EXPIRATION_OPTIONS, formatDateTime, generateSlug } from '@/lib/links';

export default function GeneratorPage() {
  const [url, setUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [expiration, setExpiration] = useState('24h');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const canvasWrapRef = useRef(null);
  const svgWrapRef = useRef(null);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    setCopied(false);
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url, alias: alias.trim() || undefined, expiration }),
      });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear el enlace');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.short_url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = result.short_url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function triggerDownload(href, filename) {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function downloadPng() {
    const canvas = canvasWrapRef.current?.querySelector('canvas');
    if (!canvas || !result) return;
    triggerDownload(canvas.toDataURL('image/png'), `qr-${result.link.slug}.png`);
  }

  function downloadSvg() {
    const svg = svgWrapRef.current?.querySelector('svg');
    if (!svg || !result) return;
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const blob = new Blob(
      ['<?xml version="1.0" encoding="UTF-8"?>\n', new XMLSerializer().serializeToString(clone)],
      { type: 'image/svg+xml;charset=utf-8' }
    );
    const href = URL.createObjectURL(blob);
    triggerDownload(href, `qr-${result.link.slug}.svg`);
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

  function reset() {
    setUrl('');
    setAlias('');
    setResult(null);
    setError('');
  }

  const expLabel = EXPIRATION_OPTIONS.find((o) => o.value === expiration)?.label;

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-5xl px-3 py-6 sm:px-4 sm:py-10 lg:py-14">
        <div className="mb-6 sm:mb-10">
          <p className="mono mb-2 text-xs uppercase tracking-[0.25em] text-cyan-400/80">
            Generador
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl lg:text-4xl">
            Acorta links
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400 sm:text-base">
            Crea un enlace corto con caducidad y código QR. Cada visita queda registrada con fecha,
            hora, ubicación y dispositivo.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-5">
          {/* --------- Formulario --------- */}
          <form
            onSubmit={onSubmit}
            className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:space-y-6 sm:p-6 md:col-span-3"
          >
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400">
                URL original
              </label>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  inputMode="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/…"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-3 pl-10 pr-4 text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400">
                Alias personalizado <span className="normal-case text-zinc-600">(opcional)</span>
              </label>
              <div className="flex overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 transition focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20">
                <span className="mono hidden items-center border-r border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-500 sm:flex">
                  /
                </span>
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value.replace(/[^A-Za-z0-9_-]/g, ''))}
                  placeholder="vacío = aleatorio"
                  maxLength={64}
                  className="mono w-full bg-transparent px-4 py-3 text-zinc-100 placeholder-zinc-600 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setAlias(generateSlug(6))}
                  title="Sugerir alias aleatorio"
                  className="flex items-center gap-1 border-l border-zinc-800 px-3 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-cyan-400"
                >
                  <Wand2 className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1.5 text-xs text-zinc-600">
                Letras, números, guion y guion bajo. Mínimo 3 caracteres.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400">
                Expiración
              </label>
              <div className="relative">
                <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <select
                  value={expiration}
                  onChange={(e) => setExpiration(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-zinc-700 bg-zinc-950 py-3 pl-10 pr-10 text-zinc-100 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                >
                  {EXPIRATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                  ▼
                </span>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 py-3 font-semibold text-black transition hover:bg-cyan-400 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generar enlace
              </button>
              {result && (
                <button
                  type="button"
                  onClick={reset}
                  className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800"
                >
                  <RefreshCw className="h-4 w-4" /> Nuevo
                </button>
              )}
            </div>
          </form>

          {/* --------- Resultado --------- */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6 md:col-span-2">
            {!result ? (
              <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center sm:min-h-[320px]">
                <div className="mb-4 grid h-32 w-32 grid-cols-5 sm:h-40 sm:w-40 gap-1 rounded-xl border border-dashed border-zinc-700 p-4 opacity-40">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-sm ${[0, 1, 3, 4, 5, 9, 12, 15, 19, 20, 21, 23, 24].includes(i) ? 'bg-zinc-600' : ''}`}
                    />
                  ))}
                </div>
                <p className="text-sm text-zinc-500">
                  El enlace corto y su código QR aparecerán aquí.
                </p>
                <p className="mt-1 text-xs text-zinc-600">Expiración seleccionada: {expLabel}</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Enlace corto
                  </p>
                  <div className="flex items-stretch overflow-hidden rounded-lg border border-cyan-500/40 bg-cyan-500/5">
                    <a
                      href={result.short_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mono min-w-0 flex-1 truncate px-3 py-3 text-cyan-300 hover:underline sm:px-4"
                      title={result.short_url}
                    >
                      {result.short_url.replace(/^https?:\/\//, '')}
                    </a>
                    <button
                      onClick={copy}
                      className={`flex shrink-0 items-center gap-1.5 px-3 text-sm font-medium transition sm:px-4 ${
                        copied ? 'bg-emerald-500 text-black' : 'bg-cyan-500 text-black hover:bg-cyan-400'
                      }`}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div ref={svgWrapRef} className="w-full max-w-[220px] rounded-xl bg-white p-3 [&>svg]:h-auto [&>svg]:w-full">
                    <QRCodeSVG value={result.short_url} size={200} level="M" marginSize={2} />
                  </div>
                  {/* Canvas oculto en alta resolución para PNG */}
                  <div ref={canvasWrapRef} className="hidden">
                    <QRCodeCanvas value={result.short_url} size={1024} level="M" marginSize={4} />
                  </div>
                  <div className="mt-4 flex w-full gap-2">
                    <button
                      onClick={downloadPng}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
                    >
                      <Download className="h-4 w-4" /> PNG
                    </button>
                    <button
                      onClick={downloadSvg}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
                    >
                      <Download className="h-4 w-4" /> SVG
                    </button>
                  </div>
                </div>

                <dl className="space-y-2 border-t border-zinc-800 pt-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Expira</dt>
                    <dd className="text-right text-zinc-300">
                      {result.link.expires_at ? formatDateTime(result.link.expires_at) : 'Nunca'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="shrink-0 text-zinc-500">Destino</dt>
                    <dd className="min-w-0 truncate text-right">
                      <a
                        href={result.link.original_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex max-w-full items-center gap-1 text-zinc-300 hover:text-cyan-300"
                        title={result.link.original_url}
                      >
                        <span className="truncate">{result.link.original_url}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
