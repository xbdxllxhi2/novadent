import { Environment } from './environment.model';

/**
 * Runtime overrides published by `public/config.js`, which `index.html` loads as a plain
 * synchronous script before the Angular bundle evaluates this module. The committed config.js is
 * empty, so local builds get the defaults below; a deployment regenerates it at start-up.
 */
declare global {
  interface Window {
    __APP_CONFIG__?: Partial<{
      /** 'mock' runs the published image on the in-browser adapters (demo deployments). */
      backend: string;
      apiBaseUrl: string;
      keycloakIssuer: string;
      keycloakClientId: string;
    }>;
  }
}

// `typeof window` guard: keeps this module safe to evaluate without a DOM (tests, tooling).
// Empty strings count as unset so a blank env var falls through to the default.
const runtime = (typeof window !== 'undefined' && window.__APP_CONFIG__) || {};

export const environment: Environment = {
  // This file IS the production environment. angular.json swaps it for
  // environment.development.ts under the development configuration. A deployment can still ask
  // for the mock adapters at container start (BACKEND_MODE=mock), which is how the demo runs
  // before the API exists; anything else means the real backend.
  backend: runtime.backend === 'mock' ? 'mock' : 'remote',
  apiBaseUrl: runtime.apiBaseUrl || 'http://localhost:8080',
  keycloak: {
    issuer: runtime.keycloakIssuer || 'http://localhost:8081/realms/novadent',
    clientId: runtime.keycloakClientId || 'novadent-frontend',
  },
};
