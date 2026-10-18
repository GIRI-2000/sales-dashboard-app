import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import App from '@/App';
import { AuthContext, type AuthContextValue } from '@/hooks/auth.context';

vi.mock('@/lib/model', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/model')>();
  return {
    ...actual,
    useModelRows: () => ({ rows: [], isLoading: true, error: undefined, refetch: async () => {} }),
  };
});

const auth = {
  session: { user: { id: 'u1', email: 'planner@contoso.com' }, isAuthenticated: true, isAnonymous: false },
  isAuthenticated: true,
  isLoading: false,
  canSignIn: true,
  signIn: async () => {},
  isSigningIn: false,
  signInError: null,
  config: { kind: 'ready' },
  error: null,
} as unknown as AuthContextValue;

describe('App', () => {
  it('renders the navigation shell while the model loads', () => {
    render(
      <AuthContext.Provider value={auth}>
        <App />
      </AuthContext.Provider>
    );
    expect(screen.getByRole('heading', { name: 'Pulse' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Plan Studio/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Action Board/ })).toBeInTheDocument();
  });
});
