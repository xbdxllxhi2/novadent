# Static image for the Angular SPA: build with Node, serve with nginx.
#
# Build context is THIS directory (frontend/), not the repo root:
#   docker build -t novadent-frontend frontend/
#
# The image is environment-agnostic: the backend mode, API host and Keycloak realm are read
# at CONTAINER START from environment variables, not compiled in. runtime-config.sh writes
# them into config.js, which index.html loads before the Angular bundle.
#
#   docker run -e BACKEND_MODE=mock -p 8080:80 novadent-frontend          # demo on mock data
#   docker run -e API_BASE_URL=https://api.example.com ... novadent-frontend
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies before copying sources so the layer caches on lockfile changes only.
# `npm ci` installs exactly what package-lock.json pins; .npmrc carries legacy-peer-deps.
COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .

RUN npm run build

FROM nginx:alpine

RUN apk upgrade --no-cache

# The `@angular/build:application` builder emits browser assets into a browser/ subdirectory;
# the sibling 3rdpartylicenses.txt is build metadata and is deliberately not served.
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Security headers live in their own file because nginx.conf has to include them once per
# location block (see the comment at the top of the .inc).
COPY security-headers.inc /etc/nginx/conf.d/security-headers.inc

# Runs via the stock nginx entrypoint, which executes /docker-entrypoint.d/*.sh in filename
# order before starting the server. Keeping the default ENTRYPOINT means nginx's own init
# still happens.
COPY runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
