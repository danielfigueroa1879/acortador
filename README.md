# Acortador — URL Shortener con QR, expiración y analíticas

Next.js 15 (App Router) · Tailwind CSS 4 · Supabase

## 1. Instalar dependencias

```bash
npm install
# (equivalente manual)
npm i next@15.5.4 react@19.1.1 react-dom@19.1.1 @supabase/supabase-js qrcode.react lucide-react server-only
npm i -D tailwindcss @tailwindcss/postcss
```

## 2. Base de datos

Supabase → SQL Editor → pega `supabase/schema.sql` → Run.

## 3. Variables de entorno

```bash
cp .env.local.example .env.local
```

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave **service_role** (secreta, solo servidor) |
| `NEXT_PUBLIC_BASE_URL` | Dominio público, ej. `https://acortar.midominio.cl` |
| `ADMIN_PASSWORD` | Clave para entrar al generador y al dashboard |
| `SESSION_SECRET` | Cadena aleatoria (`openssl rand -hex 32`) |
| `GEOIP_FALLBACK` | `true` para usar ip-api.com / ipapi.co como respaldo |

## 4. Ejecutar

```bash
npm run dev     # http://localhost:3000
npm run build && npm start
```

## Rutas

| Ruta | Acceso | Función |
|---|---|---|
| `/` | Protegida | Generador de enlaces + QR |
| `/admin` | Protegida | Dashboard y analíticas |
| `/login` | Pública | Ingreso con contraseña |
| `/[slug]` | Pública | Redirección 307 + registro del clic |
| `/expired` | Pública | Enlace expirado / bloqueado / inexistente |

## Despliegue en Netlify

Conecta el repo; Netlify detecta Next.js automáticamente. Carga las variables
de entorno en Site settings → Environment variables. La geolocalización sale
de la cabecera `x-nf-geo` (sin costo ni latencia); en Vercel, de `x-vercel-ip-*`.

## Notas

- Las vistas previas de WhatsApp/Telegram/Facebook se registran como `bot` y el
  dashboard las oculta por defecto, para que no inflen los clics reales.
- El clic se guarda con `after()` de Next.js: la redirección sale inmediatamente
  y el registro (incluida la consulta GeoIP) ocurre después.
- La IP es dato personal: define cuánto tiempo conservas la tabla `clicks`.
