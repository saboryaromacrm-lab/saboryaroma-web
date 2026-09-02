# Sabor y Aroma — Sitio web (tienda pública)

La cara pública del negocio: catálogo mayorista online con carrito y checkout,
conectado en vivo al CRM. **No tiene base de datos propia ni panel de
administración**: todo el contenido (productos, precios, stock, banners, logo,
ofertas) se administra desde el módulo **Web** del CRM y llega por la API.

Stack: **Next.js (App Router) + React + TypeScript**, CSS Modules, sin
librerías de UI. PWA instalable (manifest + service worker) y SEO resuelto en
el servidor (metadata, `sitemap.xml`, `robots.txt`).

---

## Cómo se relaciona con los otros proyectos

```
sitio-web (3002)  ──►  crm-api (3001)  ◄──  crm-dashboard (3000)
   tienda pública        PostgreSQL           administración
```

- Repositorio de la API: **https://github.com/saboryaromacrm-lab/crm-api**
- Repositorio del CRM: **https://github.com/saboryaromacrm-lab/crm-dashboard**

El sitio consume **solo los endpoints públicos de tienda** de la API:

| Endpoint | Para qué |
|----------|----------|
| `GET /tienda/catalogo` | Productos publicados con precio (lista mayorista) y stock — sin caché: precios y stock cambian seguido |
| `POST /tienda/pedidos` | El checkout crea el pedido, que aparece al instante como **orden web** en el CRM (con alerta sonora al administrador) |
| `POST /tienda/eventos` | Estadísticas propias (visitas, producto visto, carrito, checkout) — se ven en CRM › Web › Estadísticas |
| `GET /tienda/imagenes/...` | Imágenes del catálogo subidas desde el módulo Web |

Son los **únicos** endpoints de la API que no piden sesión: el resto está
cerrado por el guard global de `crm-api` (`Authorization: Bearer`). Tienen
rate-limit por IP del lado de la API.

## Puesta en marcha

Necesita la API corriendo (y esta a su vez PostgreSQL — el paso a paso está en
el README de `crm-api`).

```bash
npm install
npm run dev      # http://localhost:3002
npm run build    # build de producción
npm run start    # sirve el build (puerto 3002)
```

### Variables de entorno (`.env.local`, no se sube — copiar de `.env.example`)

| Variable | Para qué | Valor en desarrollo |
|----------|----------|---------------------|
| `NEXT_PUBLIC_API_URL` | URL base de `crm-api` | `http://localhost:3001/api` |
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio (SEO: canonical, sitemap, robots) | `http://localhost:3002` |

## Estructura

```
src/
├── app/                 # App Router
│   ├── page.tsx         # Home: hero, carruseles de productos y marcas
│   ├── tienda/          # Catálogo con filtros (búsqueda, categoría, marca)
│   ├── carrito/         # Carrito completo
│   ├── checkout/        # Datos del cliente + entrega → POST /tienda/pedidos
│   ├── layout.tsx       # Metadata/SEO, header, footer, mini-carrito
│   ├── manifest.ts      # PWA
│   ├── robots.ts        # SEO
│   └── sitemap.ts       # SEO
├── components/          # Header, HeroSlider, ProductCard, MiniCart, filtros…
└── lib/
    ├── api.ts           # Cliente de los endpoints públicos de tienda
    ├── cart.tsx         # Estado del carrito (contexto + localStorage)
    ├── analytics.ts     # Envío de eventos a /tienda/eventos
    └── types.ts         # Tipos del catálogo
```

## Decisiones de diseño

- **El CRM es la única fuente de verdad.** El sitio no guarda productos ni
  precios: si algo se ve mal, se corrige en CRM › Web y se refresca. No hay
  nada que "sincronizar".
- **El pedido no cobra.** El checkout registra la orden y el cliente coordina
  pago y entrega con el negocio (venta mayorista con trato directo). La caja,
  la facturación y el stock se resuelven en el CRM al confirmar la orden.
- **Precios sin caché.** El catálogo se pide con `cache: 'no-store'`: un precio
  viejo mostrado como vigente es peor que una carga un poco más lenta.
- **Estadísticas propias.** Sin Google Analytics ni cookies de terceros: los
  eventos van a la API del negocio y se miran en el CRM.

## Pendientes conocidos

- **Catálogo real**: migrar los ~550 productos de WooCommerce (importador
  masivo del lado del CRM; las fotos entran a disco comprimidas a WebP).
- **Iconos reales de la PWA** (`public/icons/` sigue con placeholders).
- **Deploy**: sumar el sitio como tercer servicio del Dokploy donde ya corren
  la API y el CRM (`crm-api/deploy/DEPLOY.md` §9) — verificando que el proxy
  no concatene `X-Forwarded-For`, o el rate-limit de la API deja de ser fiable.
- **Dirección de entrega en el checkout**: hoy el pedido con envío (`cadete`,
  `camioneta`) no pide domicilio; depende de las notas o del WhatsApp posterior.

## Documentación

La documentación funcional VIVA del sistema completo (procesos, decisiones,
registro de cambios) está dentro del CRM: **Info de sistema** (`/info`). Este
README cubre solo lo propio del sitio.
