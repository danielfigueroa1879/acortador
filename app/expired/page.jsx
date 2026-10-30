import { Clock, Ban, SearchX, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Enlace no disponible',
  robots: { index: false, follow: false },
};

const REASONS = {
  expired: {
    icon: Clock,
    title: 'Este enlace expiró',
    text: 'El tiempo de vigencia definido para este enlace ya terminó.',
  },
  inactive: {
    icon: Ban,
    title: 'Enlace desactivado',
    text: 'El administrador bloqueó este enlace y ya no redirige a su destino.',
  },
  notfound: {
    icon: SearchX,
    title: 'Enlace no encontrado',
    text: 'La dirección no existe o fue eliminada. Revisa que esté bien escrita.',
  },
  error: {
    icon: AlertTriangle,
    title: 'No disponible temporalmente',
    text: 'Ocurrió un problema al verificar el enlace. Intenta nuevamente en unos minutos.',
  },
};

export default async function ExpiredPage({ searchParams }) {
  const { r } = await searchParams;
  const reason = REASONS[r] || REASONS.notfound;
  const Icon = reason.icon;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center shadow-2xl sm:p-8">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800/70">
          <Icon className="h-7 w-7 text-amber-400" />
        </div>
        <p className="mono mb-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
          Enlace expirado o no disponible
        </p>
        <h1 className="mb-3 text-xl font-semibold text-zinc-100 sm:text-2xl">{reason.title}</h1>
        <p className="text-sm leading-relaxed text-zinc-400">{reason.text}</p>
        <p className="mt-6 text-xs text-zinc-600">
          Si necesitas acceso, solicita un nuevo enlace a quien te lo compartió.
        </p>
      </div>
    </main>
  );
}
