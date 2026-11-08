export interface KeycloakEnvironment {
  /** Realm base URL (the OIDC issuer). Unused until the backend phase. */
  issuer: string;
  /** Public SPA client with PKCE. Unused until the backend phase. */
  clientId: string;
}

export interface Environment {
  /** 'mock' runs entirely in the browser on localStorage-backed adapters. */
  backend: 'remote' | 'mock';
  apiBaseUrl: string;
  keycloak: KeycloakEnvironment;
}
