'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const THEME_COLOR = { light: '#f4f4f5', dark: '#0a0b0f' };

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    const current = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    applyTheme(current); // sincroniza la meta theme-color de la barra del navegador
    setTheme(current);

    // Si el usuario no eligió un tema, seguir los cambios del sistema
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = (e) => {
      let saved = null;
      try { saved = localStorage.getItem('theme'); } catch {}
      if (saved) return;
      const t = e.matches ? 'light' : 'dark';
      applyTheme(t);
      setTheme(t);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    setTheme(next);
    try { localStorage.setItem('theme', next); } catch {}
  }

  const isLight = theme === 'light';
  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex items-center justify-center rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 ${className}`}
      title={isLight ? 'Cambiar a modo noche' : 'Cambiar a modo día'}
      aria-label={isLight ? 'Cambiar a modo noche' : 'Cambiar a modo día'}
    >
      {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
