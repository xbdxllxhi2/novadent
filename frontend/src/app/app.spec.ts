import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';

describe('routes', () => {
  it('declares the sign-in page and the shell', () => {
    expect(routes.some((r) => r.path === 'sign-in')).toBe(true);
    const shell = routes.find((r) => r.path === '' && r.children);
    expect(shell?.children?.some((c) => c.path === 'patients')).toBe(true);
  });
});
