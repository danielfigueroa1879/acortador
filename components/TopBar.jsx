'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Link2, LayoutDashboard, LogOut, Scissors } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/login', { method: 'DELETE' });
    router.replace('/login');
    router.refresh();
  }

  const item = (href, label, Icon) => {
    const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition sm:px-3 ${
          active ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
        }`}
      >
        <Icon className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-(--app-bg)/85 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15">
            <Scissors className="h-4 w-4 text-cyan-400" />
          </div>
          <span className="font-semibold tracking-tight text-zinc-100 max-[359px]:hidden">Acortador</span>
        </Link>
        <nav className="flex items-center gap-0.5 sm:gap-1">
          {item('/', 'Generar', Link2)}
          {item('/admin', 'Dashboard', LayoutDashboard)}
          <ThemeToggle />
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-zinc-500 sm:px-3 transition hover:bg-zinc-900 hover:text-rose-400"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </nav>
      </div>
    </header>
  );
}
