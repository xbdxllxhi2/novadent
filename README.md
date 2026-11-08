# Novodent

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

## Commands (frontend)

| Command | What it does |
|---|---|
| `npm start` | Dev server with the mock backend |
| `npm test` | Unit tests (vitest, jsdom) |
| `npm run build` | Production build into `dist/frontend/browser` |
| `npm run format` | Prettier over sources and translations |
