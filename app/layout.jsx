import './globals.css';

export const metadata = {
  title: 'Acortador',
  description: 'Acortador de enlaces con QR, expiración y analíticas',
  robots: { index: false, follow: false },
};

export const viewport = {
  themeColor: '#0a0b0f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

// Aplica el tema antes del primer pintado (evita el destello oscuro/claro).
// Preferencia guardada > preferencia del sistema.
const THEME_SCRIPT = `(function(){try{
var t=localStorage.getItem('theme');
if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}
document.documentElement.dataset.theme=t;
var m=document.querySelector('meta[name="theme-color"]');
if(m)m.setAttribute('content',t==='light'?'#f4f4f5':'#0a0b0f');
}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="es" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-(--app-bg) text-zinc-200">{children}</body>
    </html>
  );
}
