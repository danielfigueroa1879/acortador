/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // El generador vive dentro de /admin para que la app instalada (alcance /admin)
  // no capture los enlaces cortos de la raíz.
  async redirects() {
    return [{ source: '/', destination: '/admin/generar', permanent: false }];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default nextConfig;
