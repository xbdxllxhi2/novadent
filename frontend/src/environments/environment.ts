import { Environment } from './environment.model';

/**
 * Runtime overrides published by `public/config.js`, which `index.html` loads as a plain
 * synchronous script before the Angular bundle evaluates this module. The committed config.js is
 * empty, so local builds get the defaults below; a deployment regenerates it at start-up.
 */
declare global {
  interface Window {
    __APP_CONFIG__?: Partial<{
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
  // environment.development.ts under the development configuration, which is where 'mock' lives.
  backend: 'remote',
  apiBaseUrl: runtime.apiBaseUrl || 'http://localhost:8080',
  keycloak: {
    issuer: runtime.keycloakIssuer || 'http://localhost:8081/realms/novodent',
    clientId: runtime.keycloakClientId || 'novodent-frontend',
  },
};
