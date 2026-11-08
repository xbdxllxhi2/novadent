# Novodent

Dental clinic management system for one multi-doctor clinic in Mauritania. Languages fr (default),
ar (RTL), en. Currency MRU as integers, never decimals. Patient names are stored in both Latin and
Arabic script. Roles are named bundles of permissions; code checks permissions, never role names.

## Layout

- `frontend/` : Angular 21 app. Currently the only part that exists. Built against mock backends.
- `backend/` : Spring Boot 4 / Java 21 API (later). `desktop/` : Tauri 2 shell (later).

## Frontend stack

- **Angular 21**, standalone components only, **zoneless**, signals everywhere (`signal`, `computed`,
  `effect`, `input()`, `output()`, `model()`), `inject()` only (no constructor parameters).
- **PrimeNG 21** with the Aura preset extended in `frontend/src/app/core/theme/novodent-preset.ts`.
  Dark mode is the `.dark` class on `<html>` (`darkModeSelector: '.dark'`).
- **Tailwind CSS v4**, CSS-first (`@theme` in `frontend/src/styles.css`, no `tailwind.config.js`),
  with `tailwindcss-primeui` so utilities alias PrimeNG tokens.
- **Transloco 8** for i18n, JSON files in `frontend/public/i18n/{en,fr,ar}.json`.
- **vitest** (jsdom) for unit tests, **Prettier** for formatting. npm with `legacy-peer-deps=true`
  in `frontend/.npmrc` (npm 10.9 fails on the vitest peer chain otherwise).

## Conventions (frontend)

- File names without `.component`: `patients-page.ts` + `patients-page.html`, class `PatientsPage`.
  Other suffixes carry meaning: `*.store.ts`, `*.service.ts`, `*.pipe.ts`, `*.model.ts`, `*.guard.ts`,
  `*-backend.ts`, `*.spec.ts`. `templateUrl` is always a separate file.
- Styling is Tailwind utilities in templates plus `styles.css`. Component CSS only for the
  odontogram SVG. Use `host: { class: '...' }` instead of wrapper divs.
- **Backend seams**: `domain/<ctx>/<x>-backend.ts` is an `abstract class` (the DI token) whose
  methods return `Observable<T>`. `backends/mock/mock-<x>-backend.ts` and
  `backends/remote/remote-<x>-backend.ts` extend it. `app.config.ts` picks one per seam from
  `environment.backend`. Remote adapters are stubs until the backend phase.
- **Mock state** lives in `localStorage` under `novodent.mock.<collection>` through
  `backends/mock/mock-db.ts`, seeded by `seed.ts` (seeded PRNG, versioned). Mock backends enforce
  permissions and ownership like the real API will.
- **Stores** (`*.store.ts`, `providedIn: 'root'`) wrap a seam, expose signals, subscribe with
  `{ next, error }`, and report every mutation through `NotifyService`.
- **Permissions**: `core/auth/permission.model.ts` is the fixed list. Guard routes with
  `permissionGuard('x.y')`, hide UI with `*appHasPermission="'x.y'"` or `auth.can('x.y')`.
- **Colors**: the surface scale is inverted and shared by both schemes (950 = page background,
  0 = strongest text), so templates never use `dark:` for colors. In raw CSS, SVG fills, or
  keyframes use `var(--p-*)` (PrimeNG runtime tokens); `var(--color-*)` does not exist at runtime.
- **Type sizes** are role tokens: `text-fine`, `text-meta`, `text-caption`, `text-ui`, `text-ui-lg`,
  `text-body`. Never `text-[Npx]` except display one-offs.
- **i18n**: every user-facing string goes through Transloco, keys at depth 2 (`namespace.key`),
  all three files kept key-parallel (a spec enforces it). No emoji and no em dashes in UI strings.
  Use logical utilities (`ps-`, `ms-`, `start-0`, `text-start`) so Arabic mirrors correctly. The
  odontogram never mirrors (`dir="ltr"` on its host).
- **Money**: integer MRU, formatted by `money` pipe (no decimals). Dates/times: ISO strings in
  models, `Intl` formatting through `core/i18n/formats.ts` with `fr-MR`, `ar-MR-u-nu-latn`, `en-MR`.
- Future Tauri: no `window.open`, no hard reload on deep routes, printing is the
  `/print/invoice/:id` route.

## Verifying changes

- `npm test` covers the pure logic (permissions, conflicts, slot math, chart derivation, invoice
  math, production report, text normalization, formats, mock-db, i18n parity).
- Screens are checked in a real browser: start `npm start`, then drive http://localhost:4200 with a
  Playwright script (sign in by clicking a demo-user card on `/sign-in`), read console errors and
  look at the screenshot. The seed closes the clinic on Sunday, so scheduler checks step to Monday.
- If the dev server stops picking up new files, kill the port 4200 listener and start it again.

## Commands

```powershell
cd frontend
Copy-Item src/environments/environment.development.ts.example src/environments/environment.development.ts  # once
npm install
npm start          # mock backend, http://localhost:4200
npm test           # vitest
npm run build      # production build
npm run format
```
