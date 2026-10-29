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
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#0a0b0f] text-zinc-200">{children}</body>
    </html>
  );
}
