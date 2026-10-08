import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';

export const AuthContext = createContext<{ user: User } | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthGate>');
  return ctx;
}
