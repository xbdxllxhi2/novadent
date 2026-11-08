#!/bin/sh
# Regenerate the runtime config the SPA reads before it boots.
#
# Installed into /docker-entrypoint.d/, which the stock nginx entrypoint executes in filename
# order before starting the server, so nginx's own init still runs. Scripts here must NOT exec
# the CMD.
#
# One published image serves any environment: the backend mode, API host and Keycloak realm
# are container environment variables, not build inputs.
#
#   BACKEND_MODE=mock      run on the in-browser adapters (demo, no API needed)
#   BACKEND_MODE=remote    talk to API_BASE_URL and authenticate against KEYCLOAK_ISSUER
#
# Any variable left unset is emitted empty, and environment.ts treats empty as "use the
# default" (remote mode pointed at localhost), so a container started with no variables still
# serves a working bundle.
set -eu

cat > /usr/share/nginx/html/config.js <<EOF
// Generated at container start by /docker-entrypoint.d/40-runtime-config.sh.
window.__APP_CONFIG__ = {
  backend: "${BACKEND_MODE:-}",
  apiBaseUrl: "${API_BASE_URL:-}",
  keycloakIssuer: "${KEYCLOAK_ISSUER:-}",
  keycloakClientId: "${KEYCLOAK_CLIENT_ID:-}"
};
EOF

echo "runtime-config: backend=${BACKEND_MODE:-<default remote>}" \
     "apiBaseUrl=${API_BASE_URL:-<default>}" \
     "issuer=${KEYCLOAK_ISSUER:-<default>}" \
     "clientId=${KEYCLOAK_CLIENT_ID:-<default>}"
