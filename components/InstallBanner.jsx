'use client';

import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

const DISMISS_KEY = 'install-banner-dismissed';
const DISMISS_DAYS = 7;

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function recentlyDismissed() {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY));
    return t && Date.now() - t < DISMISS_DAYS * 864e5;
  } catch {
    return false;
  }
}

/**
 * Banner para instalar la app. En Chrome/Edge/Android usa el aviso nativo
 * (beforeinstallprompt); en iPhone/iPad, que no lo tiene, muestra las
 * instrucciones de "Agregar a inicio".
 */
export default function InstallBanner() {
  const [prompt, setPrompt] = useState(null);
  const [ios, setIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' }).catch(() => {});
    }
    if (isStandalone() || recentlyDismissed()) return;

    const onPrompt = (e) => {
      e.preventDefault();
      setPrompt(e);
      setVisible(true);
    };
    const onInstalled = () => setVisible(false);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    if (isIos) {
      setIos(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
  }

  async function install() {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice.catch(() => ({}));
    setPrompt(null);
    if (outcome === 'accepted') setVisible(false);
    else dismiss();
  }

  if (!visible) return null;

  // Colores fijos (no la escala zinc, que se invierte en modo claro)
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
      <div className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-white/60 bg-white/80 p-3 text-[#18181b] shadow-2xl shadow-black/20 backdrop-blur-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/favicon-96x96.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Instalar Acortador</p>
          {ios ? (
            <p className="text-xs text-[#52525b]">
              Toca <Share className="inline h-3.5 w-3.5 -translate-y-px" /> Compartir y luego “Agregar a inicio”.
            </p>
          ) : (
            <p className="text-xs text-[#52525b]">Acceso rápido desde tu pantalla de inicio.</p>
          )}
        </div>
        {!ios && (
          <button
            onClick={install}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#06b6d4] px-3.5 py-2 text-sm font-semibold text-black transition hover:bg-[#22d3ee]"
          >
            <Download className="h-4 w-4" /> Instalar
          </button>
        )}
        <button
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1.5 text-[#71717a] transition hover:bg-black/5 hover:text-[#18181b]"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
