# syntax=docker/dockerfile:1

################################################################################
# SABOR Y AROMA — el sitio público (Next.js)
# ==============================================================================
# A diferencia del dashboard, esto NO es estático: Next corre un servidor Node
# en producción (renderiza páginas y sirve el SEO). Así que la imagen final sí
# lleva Node adentro.
#
# Usa la salida `standalone` de Next (ver next.config.mjs): en vez de arrastrar
# los node_modules enteros —cientos de megas—, Next arma una carpeta con
# EXACTAMENTE lo que el servidor necesita para arrancar.
################################################################################

# ---------------------------- 1) Construcción -------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# A DÓNDE LE PIDE LA API Y CÓMO SE LLAMA A SÍ MISMO.
#
# Las `NEXT_PUBLIC_*` se resuelven al COMPILAR, igual que las `VITE_*` del
# dashboard: quedan escritas adentro del JavaScript que baja el visitante.
# Cambiarlas no es reiniciar el contenedor, es reconstruirlo.
#
#   NEXT_PUBLIC_API_URL   la API, CON su /api final
#   NEXT_PUBLIC_SITE_URL  el origen público del sitio; lo usa el SEO para armar
#                         el sitemap, el robots.txt y los datos estructurados.
#                         Si queda mal, Google indexa direcciones que no existen.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

RUN npm run build

# ------------------------------ 2) Ejecución --------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Misma razón que en la API: alpine viene SIN base de zonas horarias, y sin
# `tzdata` la variable TZ se ignora en silencio. El sitio muestra fechas de
# ofertas y vigencias; en UTC se corren un día después de las 21 h.
ENV TZ=America/Argentina/Buenos_Aires
RUN apk add --no-cache tzdata

# El servidor de Next lee estas dos. `0.0.0.0` y no localhost: adentro de un
# contenedor, escuchar solo en su propio localhost lo vuelve inalcanzable para
# Traefik. La puerta la cierra no publicar el puerto, no el bind.
ENV PORT=3002
ENV HOSTNAME=0.0.0.0

# Las tres piezas de la salida standalone, y en este orden:
#   public/        imágenes y archivos estáticos propios
#   standalone/    el servidor mínimo (trae su server.js en la raíz)
#   .next/static/  los bundles con hash que pide el navegador
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER node

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3002/ >/dev/null || exit 1

CMD ["node", "server.js"]
