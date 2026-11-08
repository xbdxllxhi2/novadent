# Response security headers, included at server level AND inside every `location` block of
# nginx.conf: nginx's `add_header` is not additive across levels, so a location that sets its
# own header (Cache-Control here) silently drops every header its parent added.
#
# `always` keeps the headers on error responses (404, 5xx) too.
#
# The CSP is Report-Only for its first deployments. The policy is inferred from the bundle:
# inline styles from PrimeNG/Tailwind, Google Fonts, blob: images and frames for the
# attachment viewer (images and PDFs come out of IndexedDB as object URLs). Watch the browser
# console under real traffic, then switch to Content-Security-Policy.
#
# connect-src is `https:` rather than a host list because the API and Keycloak origins are
# runtime values (config.js written at container start).
#
# No Strict-Transport-Security here: TLS terminates at the ingress, which owns HSTS.

add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Content-Security-Policy-Report-Only "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self' https:; frame-src 'self' blob:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https:" always;
