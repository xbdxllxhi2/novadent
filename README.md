# Novadent

Dental clinic management system for a single multi-doctor clinic in Mauritania.
French by default, Arabic (right-to-left) and English, amounts in MRU.

## Layout

- `frontend/` : Angular 21 web app (also the future Windows desktop app through Tauri).
- `backend/` : Spring Boot API (later).
- `desktop/` : Tauri shell wrapping the frontend build (later).

## Running the frontend against mock data

```powershell
cd frontend
Copy-Item src/environments/environment.development.ts.example src/environments/environment.development.ts
npm install
npm start
```

Open http://localhost:4200. The development build uses in-browser mock backends persisted in
`localStorage`, so no API, database, or identity provider is needed. The sign-in page lists one
demo user per role (Owner, Dentist, Assistant, Receptionist, Accountant). Demo data can be reset
from Settings.

## Build and deploy

Every push to `main` runs the unit tests, builds the production bundle and publishes the
image `ghcr.io/xbdxllxhi2/novadent/frontend:sha-<short>`. Changes under `charts/` publish the
Helm chart `oci://ghcr.io/xbdxllxhi2/novadent/charts/novadent-frontend`.

The image is environment-agnostic. At container start `runtime-config.sh` writes
`config.js` from `BACKEND_MODE` (`mock` or `remote`), `API_BASE_URL`, `KEYCLOAK_ISSUER` and
`KEYCLOAK_CLIENT_ID`. The deployment on the VPS is driven by Argo CD from the
[ai-deploy](https://github.com/xbdxllxhi2/ai-deploy) repo (`envs/dev/values/novadent-frontend.yaml`
pins the image tag; mock mode until the API exists).

```powershell
docker build -t novadent-frontend frontend/
docker run -e BACKEND_MODE=mock -p 8080:80 novadent-frontend   # http://localhost:8080
```

## Commands (frontend)

| Command | What it does |
|---|---|
| `npm start` | Dev server with the mock backend |
| `npm test` | Unit tests (vitest, jsdom) |
| `npm run build` | Production build into `dist/frontend/browser` |
| `npm run format` | Prettier over sources and translations |
